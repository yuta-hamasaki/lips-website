const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { webcrypto, createHash } = require('node:crypto')
const QRCode = require('qrcode')
const jsQR = require('jsqr')

function load(file, env = {}) {
  const filename = path.join(__dirname, '../..', file)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, process: { env }, crypto: webcrypto, TextEncoder, TextDecoder, atob, URL, require() { throw new Error('Unexpected import') } }, { filename, timeout: 1000 })
  return exports
}
const basic = (name, password) => `Basic ${Buffer.from(`${name}:${password}`).toString('base64')}`

test('both named administrators have the same authentication authority, with distinct credentials', async () => {
  const password = 'dummy-secondary-32-byte-random-like-secret'
  const { authenticateAdmin } = load('lib/admin-credentials.ts', {
    ADMIN_API_KEY: 'dummy-original-secret:with-colon',
    ADMIN_ACCOUNTS_JSON: JSON.stringify([{ username: 'admin2', passwordHash: createHash('sha256').update(password).digest('hex') }]),
  })
  assert.equal(await authenticateAdmin(basic('admin', 'dummy-original-secret:with-colon')), true)
  assert.equal(await authenticateAdmin(basic('admin2', password)), true)
  assert.equal(await authenticateAdmin(basic('admin2', 'dummy-original-secret:with-colon')), false)
  assert.equal(await authenticateAdmin(basic('admin', password)), false)
  assert.equal(await authenticateAdmin(basic('unknown', password)), false)
  assert.equal(await authenticateAdmin(null), false)
  assert.equal(await authenticateAdmin('Basic !!!'), false)
})

test('malformed admin configuration fails closed instead of silently dropping accounts', async () => {
  for (const config of ['invalid', '{}', '[{"username":"admin2"}]']) {
    const { authenticateAdmin } = load('lib/admin-credentials.ts', { ADMIN_API_KEY: 'dummy', ADMIN_ACCOUNTS_JSON: config })
    assert.equal(await authenticateAdmin(basic('admin', 'dummy')), false)
  }
})

test('sales group by Vancouver purchase day, exclude refunds, never combine currencies, fill empty days', () => {
  const { dailySales } = load('lib/admin-sales.ts')
  const orders = [
    { amount: 1000, currency: 'cad', paymentStatus: 'PAID', createdAt: '2026-10-16T02:00:00Z' },
    { amount: 2000, currency: 'cad', paymentStatus: 'PAID', createdAt: '2026-10-16T15:00:00Z' },
    { amount: 9000, currency: 'cad', paymentStatus: 'REFUNDED', createdAt: '2026-10-16T15:00:00Z' },
    { amount: 7000, currency: 'usd', paymentStatus: 'PAID', createdAt: '2026-10-16T15:00:00Z' },
  ]
  const days = dailySales(orders, 'CAD', 3, new Date('2026-10-16T20:00:00Z'))
  assert.equal(days.length, 3)
  assert.equal(days[0].amount, 0)
  assert.equal(days[1].date, '2026-10-15')
  assert.equal(days[1].amount, 1000)
  assert.equal(days[2].amount, 2000)
  assert.equal(days.reduce((sum, day) => sum + day.count, 0), 2)
})

test('empty sales and DST boundary produce valid, consecutive calendar days', () => {
  const { dailySales } = load('lib/admin-sales.ts')
  const days = dailySales([], 'CAD', 3, new Date('2026-11-02T20:00:00Z'))
  assert.equal(days.map(day => day.date).join(','), '2026-10-31,2026-11-01,2026-11-02')
  assert.equal(days.reduce((sum, day) => sum + day.amount, 0), 0)
  assert.equal(dailySales([], 'CAD', 0, new Date('2026-11-02T20:00:00Z')).length, 1)
})

test('camera decoder reads the same QR payload produced by ticket generation', () => {
  const { readCheckInToken } = load('lib/check-in-token.ts')
  const token = 'a'.repeat(43)
  const payload = `https://tickets.example.invalid/admin/check-in?token=${token}`
  const qr = QRCode.create(payload)
  const scale = 6, margin = 4
  const width = (qr.modules.size + margin * 2) * scale
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255)
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const row = Math.floor(y / scale) - margin, column = Math.floor(x / scale) - margin
    if (row >= 0 && column >= 0 && row < qr.modules.size && column < qr.modules.size && qr.modules.get(row, column)) {
      const offset = (y * width + x) * 4
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0
    }
  }
  const decoded = jsQR(pixels, width, width)
  assert.equal(decoded.data, payload)
  assert.equal(readCheckInToken(decoded.data), token)
  assert.equal(readCheckInToken(token), token)
  assert.equal(readCheckInToken('https://example.invalid/not-a-ticket'), '')
  assert.equal(readCheckInToken('javascript:alert(1)'), '')
})

test('numbered accounts override legacy logins and allow independent password changes', async () => {
  const env = {
    ADMIN_1_USERNAME: 'owner', ADMIN_1_PASSWORD: 'first-secret',
    ADMIN_2_USERNAME: 'staff', ADMIN_2_PASSWORD: '',
    ADMIN_2_PASSWORD_HASH: createHash('sha256').update('existing-secret').digest('hex'),
    ADMIN_API_KEY: 'legacy-secret', ADMIN_ACCOUNTS_JSON: 'invalid',
  }
  let auth = load('lib/admin-credentials.ts', env).authenticateAdmin
  assert.equal(await auth(basic('owner', 'first-secret')), true)
  assert.equal(await auth(basic('staff', 'existing-secret')), true)
  assert.equal(await auth(basic('admin', 'legacy-secret')), false)
  auth = load('lib/admin-credentials.ts', { ...env, ADMIN_2_USERNAME: 'renamed', ADMIN_2_PASSWORD: 'replacement-secret' }).authenticateAdmin
  assert.equal(await auth(basic('renamed', 'replacement-secret')), true)
  assert.equal(await auth(basic('renamed', 'existing-secret')), false)
  assert.equal(await auth(basic('staff', 'replacement-secret')), false)
  assert.equal(await auth(basic('owner', 'first-secret')), true)
})

test('numbered configuration rejects duplicates and incomplete accounts, and allows disabling one', async () => {
  const base = { ADMIN_1_USERNAME: 'owner', ADMIN_1_PASSWORD: 'secret' }
  for (const extra of [
    { ADMIN_2_USERNAME: 'owner', ADMIN_2_PASSWORD: 'other' },
    { ADMIN_2_USERNAME: 'staff' },
    { ADMIN_2_PASSWORD: 'secret' },
    { ADMIN_2_USERNAME: 'staff', ADMIN_2_PASSWORD_HASH: 'invalid' },
  ]) {
    const { authenticateAdmin } = load('lib/admin-credentials.ts', { ...base, ...extra })
    assert.equal(await authenticateAdmin(basic('owner', 'secret')), false)
  }
  const { authenticateAdmin } = load('lib/admin-credentials.ts', base)
  assert.equal(await authenticateAdmin(basic('owner', 'secret')), true)
  assert.equal(await authenticateAdmin(basic('staff', 'secret')), false)
})

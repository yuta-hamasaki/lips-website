import { randomBytes, createHash } from 'node:crypto'
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync, chmodSync, lstatSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const username = process.argv[2]
if (!username || !/^[a-zA-Z0-9._-]{1,64}$/.test(username)) {
  console.error('Usage: node scripts/create-admin-account.mjs <username> (letters, digits, dot, dash, underscore)')
  process.exit(1)
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const values = {}
for (const name of ['.env', '.env.local']) {
  const file = resolve(root, name)
  if (!existsSync(file)) continue
  if (lstatSync(file).isSymbolicLink()) throw new Error('Environment file must not be a symlink')
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) value = value.slice(1, -1)
    values[match[1]] = value
  }
}
if (['ADMIN_1_USERNAME', 'ADMIN_1_PASSWORD', 'ADMIN_2_USERNAME', 'ADMIN_2_PASSWORD'].some(key => key in values)) {
  console.error('Manage administrator usernames and passwords in ADMIN_1_USERNAME / ADMIN_1_PASSWORD and ADMIN_2_USERNAME / ADMIN_2_PASSWORD in your environment file. This legacy script does not modify those settings.')
  process.exit(1)
}
if (username === (values.ADMIN_USERNAME || 'admin')) throw new Error('Username is reserved for the existing primary administrator')
let accounts
try { accounts = JSON.parse(values.ADMIN_ACCOUNTS_JSON || '[]') } catch { throw new Error('Invalid admin account configuration') }
if (!Array.isArray(accounts) || accounts.length >= 20 || accounts.some(a => !a || typeof a.username !== 'string' || !/^[a-f0-9]{64}$/.test(a.passwordHash))) throw new Error('Invalid admin account configuration')
if (accounts.some(account => account.username === username)) {
  console.info('That administrator already exists; credentials were not changed.')
  process.exit(0)
}
const local = resolve(root, '.local')
if (existsSync(local) && (lstatSync(local).isSymbolicLink() || !lstatSync(local).isDirectory())) throw new Error('Credential directory must be a real directory')
mkdirSync(local, { recursive: true, mode: 0o700 }); chmodSync(local, 0o700)
const password = randomBytes(32).toString('base64url')
const passwordHash = createHash('sha256').update(password).digest('hex')
const credentialFile = resolve(local, `admin-${username}.txt`)
// Credential values only go into this Git-ignored, owner-readable file.
writeFileSync(credentialFile, `Username: ${username}\nPassword: ${password}\nRole: administrator (same permissions as primary admin)\n`, { flag: 'wx', mode: 0o600 })
const file = resolve(root, existsSync(resolve(root, '.env.local')) ? '.env.local' : '.env')
const before = existsSync(file) ? readFileSync(file, 'utf8') : ''
accounts.push({ username, passwordHash })
const entry = `ADMIN_ACCOUNTS_JSON='${JSON.stringify(accounts)}'`
const after = /^\s*ADMIN_ACCOUNTS_JSON\s*=.*$/m.test(before) ? before.replace(/^\s*ADMIN_ACCOUNTS_JSON\s*=.*$/m, entry) : `${before.replace(/\s*$/, '')}\n${entry}\n`
const temporary = `${file}.admin-${randomBytes(8).toString('hex')}`
try {
  writeFileSync(temporary, after, { flag: 'wx', mode: 0o600 })
  if (existsSync(file) && readFileSync(file, 'utf8') !== before) throw new Error('Environment changed; retry after checking it')
  renameSync(temporary, file)
} catch {
  if (existsSync(temporary)) unlinkSync(temporary)
  unlinkSync(credentialFile)
  throw new Error('Administrator configuration could not be saved; no new account was retained')
}
console.info(`Administrator ${username} created. Initial credentials saved to .local/admin-${username}.txt (owner access only). Restart the development server.`)

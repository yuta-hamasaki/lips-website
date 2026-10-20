const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { webcrypto } = require('node:crypto')
const { NextRequest, NextResponse } = require('next/server')

function load(file, env, imports = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, process: { env }, crypto: webcrypto, TextEncoder, TextDecoder, atob, URL, Uint8Array, Buffer, require(name) { if (!(name in imports)) throw Error(name); return imports[name] } })
  return exports
}
const env = { ADMIN_1_USERNAME: 'owner', ADMIN_1_PASSWORD: 'test-only-secret', NEXT_PUBLIC_APP_URL: 'https://example.test' }

test('sessions reject tampering, expiry, changed credentials and missing configuration', async () => {
  const session = load('lib/admin-session.ts', env)
  const now = Date.now()
  const token = await session.createAdminSession(now)
  assert.equal(await session.verifyAdminSession(token, now), true)
  assert.equal(await session.verifyAdminSession(token, now + session.ADMIN_SESSION_SECONDS * 1000), false)
  assert.equal(await session.verifyAdminSession(token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'), now), false)
  assert.equal(await load('lib/admin-session.ts', { ...env, ADMIN_1_PASSWORD: 'changed' }).verifyAdminSession(token, now), false)
  assert.equal(await load('lib/admin-session.ts', {}).verifyAdminSession(token, now), false)
  assert.equal(await session.verifyAdminSession(undefined), false)
})

test('login sets a protected cookie, logout expires it, and foreign POSTs are refused', async () => {
  const session = load('lib/admin-session.ts', env)
  const credentials = load('lib/admin-credentials.ts', env)
  const originGuard = load('lib/admin-request-origin.ts', env)
  const imports = { '@/lib/admin-login-limit': { allowAdminLogin: async () => true }, '@/lib/admin-return-path': load('lib/admin-return-path.ts', env), '@/lib/admin-request-origin': originGuard, 'next/server': { NextResponse }, '@/lib/admin-session': session, '@/lib/admin-credentials': credentials }
  const login = load('app/api/admin/login/route.ts', env, imports).POST
  const logout = load('app/api/admin/logout/route.ts', env, imports).POST
  const request = (path, body, origin = 'https://example.test') => new NextRequest(`https://example.test${path}`, { method: 'POST', headers: { origin }, body })
  const response = await login(request('/api/admin/login', new URLSearchParams({ username: 'owner', password: 'test-only-secret' })))
  assert.equal(response.status, 303)
  const cookie = response.cookies.get(session.ADMIN_COOKIE)
  assert.equal(await session.verifyAdminSession(cookie.value), true)
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i)
  assert.match(response.headers.get('set-cookie'), /Secure/i)
  assert.match(response.headers.get('set-cookie'), /SameSite=strict/i)
  const auth = load('lib/admin-auth.ts', env, { '@/lib/admin-session': session })
  assert.equal(await auth.isAdminRequest(new NextRequest('https://example.test/admin', { headers: { cookie: `${session.ADMIN_COOKIE}=${cookie.value}` } })), true)
  assert.equal(await auth.isAdminRequest(new NextRequest('https://example.test/admin', { headers: { authorization: `Basic ${Buffer.from('owner:test-only-secret').toString('base64')}` } })), false)
  const result = await logout(request('/api/admin/logout'))
  assert.equal(result.cookies.get(session.ADMIN_COOKIE).value, '')
  assert.equal(result.headers.get('clear-site-data'), null)
  assert.match(result.headers.get('set-cookie'), /Max-Age=0/)
  assert.equal(result.headers.get('location'), 'https://example.test/')
  assert.equal((await logout(request('/api/admin/logout', undefined, 'https://foreign.test'))).status, 403)
  assert.equal((await login(request('/api/admin/login', new URLSearchParams({ username: 'owner', password: 'wrong' })))).cookies.get(session.ADMIN_COOKIE), undefined)
})


test('logout works on another development port and redirects to the browser origin', async () => {
  const localEnv = { ...env, NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }
  const session = load('lib/admin-session.ts', localEnv)
  const originGuard = load('lib/admin-request-origin.ts', localEnv)
  const logout = load('app/api/admin/logout/route.ts', localEnv, {
    'next/server': { NextResponse }, '@/lib/admin-session': session, '@/lib/admin-request-origin': originGuard,
  }).POST
  const request = origin => new NextRequest('http://localhost:3001/api/admin/logout', {
    method: 'POST', headers: origin ? { origin } : {},
  })
  const response = await logout(request('http://localhost:3001'))
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('location'), 'http://localhost:3001/')
  assert.equal(response.cookies.get(session.ADMIN_COOKIE).value, '')
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/)
  const jsonResponse = await logout(new NextRequest('http://localhost:3001/api/admin/logout', {
    method: 'POST', headers: { origin: 'http://localhost:3001', accept: 'application/json' },
  }))
  assert.equal(jsonResponse.status, 200)
  assert.equal((await jsonResponse.json()).loggedOut, true)
  assert.match(jsonResponse.headers.get('set-cookie'), /Max-Age=0/)
  assert.equal((await logout(request('https://foreign.test'))).status, 403)
  assert.equal((await logout(request())).status, 403)
  assert.equal((await logout(request('null'))).status, 403)
  const auth = load('lib/admin-auth.ts', localEnv, { '@/lib/admin-session': session })
  assert.equal(await auth.isAdminRequest(new NextRequest('http://localhost:3001/admin')), false)
})

test('login preserves the QR destination, rejects external destinations and enforces rate limits', async () => {
  const session = load('lib/admin-session.ts', env)
  const paths = load('lib/admin-return-path.ts', env)
  for (const value of ['https://evil.test/admin/check-in', '//evil.test/admin/check-in', '/admin/../payment/success', '/admin/login', '/admin/\\evil']) {
    assert.equal(paths.adminReturnPath(value), '/admin/events')
  }
  const destination = '/admin/check-in?token=example-token'
  assert.equal(paths.adminReturnPath(destination), destination)
  const imports = { 'next/server': { NextResponse }, '@/lib/admin-session': session,
    '@/lib/admin-credentials': load('lib/admin-credentials.ts', env), '@/lib/admin-return-path': paths,
    '@/lib/admin-request-origin': load('lib/admin-request-origin.ts', env),
    '@/lib/admin-login-limit': { allowAdminLogin: async () => true } }
  const request = () => new NextRequest('https://example.test/api/admin/login', { method: 'POST', headers: { origin: 'https://example.test' },
    body: new URLSearchParams({ username: 'owner', password: env.ADMIN_1_PASSWORD, next: destination }) })
  const login = () => load('app/api/admin/login/route.ts', env, imports).POST(request())
  assert.equal((await login()).headers.get('location'), `https://example.test${destination}`)
  imports['@/lib/admin-login-limit'] = { allowAdminLogin: async () => false }
  const limited = await login()
  assert.equal(limited.cookies.get(session.ADMIN_COOKIE), undefined)
  assert.equal(new URL(limited.headers.get('location')).searchParams.get('limited'), '1')
  assert.equal(limited.headers.get('retry-after'), '900')
  imports['@/lib/admin-login-limit'] = { allowAdminLogin: async () => { throw Error('DB unavailable') } }
  assert.equal((await login()).status, 503)
})

test('production accepts only the configured HTTPS origin', () => {
  const guard = load('lib/admin-request-origin.ts', { ...env, NODE_ENV: 'production' })
  const request = origin => new NextRequest('http://internal.test/api/admin/logout', { method: 'POST', headers: { origin } })
  assert.equal(guard.adminRequestOrigin(request('http://internal.test')), null)
  assert.equal(guard.adminRequestOrigin(request('https://example.test')), 'https://example.test')
})


test('production sessions require an independent strong signing secret', async () => {
  const unsafe = load('lib/admin-session.ts', { ...env, NODE_ENV: 'production' })
  await assert.rejects(unsafe.createAdminSession(), /ADMIN_SESSION_SECRET/)
  const secure = load('lib/admin-session.ts', { ...env, NODE_ENV: 'production', ADMIN_SESSION_SECRET: 'test-only-independent-secret-value-0123456789' })
  assert.equal(await secure.verifyAdminSession(await secure.createAdminSession()), true)
})

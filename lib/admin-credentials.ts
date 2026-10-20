// Shared by Edge middleware and Node routes. Never import into client components.
type AdminAccount = { username: string; passwordHash: string }
type PasswordAccount = { username: string; password: string; passwordHash?: string }

function managedAccounts(): PasswordAccount[] | null | undefined {
  const entries = [
    { username: process.env.ADMIN_1_USERNAME, password: process.env.ADMIN_1_PASSWORD, passwordHash: process.env.ADMIN_1_PASSWORD_HASH },
    { username: process.env.ADMIN_2_USERNAME, password: process.env.ADMIN_2_PASSWORD, passwordHash: process.env.ADMIN_2_PASSWORD_HASH },
  ]
  if (entries.every(entry => entry.username === undefined && entry.password === undefined && entry.passwordHash === undefined)) return undefined
  const configured: PasswordAccount[] = []
  const names = new Set<string>()
  for (const entry of entries) {
    if (!entry.username && !entry.password && !entry.passwordHash) continue
    if (!entry.username || !/^[a-zA-Z0-9._-]{1,64}$/.test(entry.username) || (!entry.password && !/^[a-f0-9]{64}$/.test(entry.passwordHash || '')) || names.has(entry.username)) return null
    names.add(entry.username)
    configured.push({ username: entry.username, password: entry.password || '', passwordHash: entry.passwordHash })
  }
  return configured
}

function accounts(): AdminAccount[] | null {
  if (!process.env.ADMIN_ACCOUNTS_JSON) return []
  try {
    const value: unknown = JSON.parse(process.env.ADMIN_ACCOUNTS_JSON)
    if (!Array.isArray(value) || value.length > 20) return null
    const names = new Set<string>()
    for (const account of value) {
      if (!account || typeof account.username !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(account.username) ||
          typeof account.passwordHash !== 'string' || !/^[a-f0-9]{64}$/.test(account.passwordHash) || names.has(account.username)) return null
      names.add(account.username)
    }
    return value as AdminAccount[]
  } catch { return null }
}

function equal(a: string, b: string): boolean {
  let difference = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return difference === 0
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function authenticateAdmin(authorization: string | null): Promise<boolean> {
  if (!authorization?.startsWith('Basic ') || authorization.length > 2048) return false
  const managed = managedAccounts()
  const configured = managed === undefined ? accounts() : []
  if (managed === null || configured === null) return false
  let username: string, password: string
  try {
    const bytes = Uint8Array.from(atob(authorization.slice(6)), character => character.charCodeAt(0))
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const colon = decoded.indexOf(':')
    if (colon < 1) return false
    username = decoded.slice(0, colon)
    password = decoded.slice(colon + 1)
  } catch { return false }
  const actual = await digest(password)
  if (managed !== undefined) {
    let permitted = false
    for (const account of managed) {
      const passwordMatches = equal(actual, account.password ? await digest(account.password) : account.passwordHash!)
      const usernameMatches = equal(username, account.username)
      if (passwordMatches && usernameMatches) permitted = true
    }
    return permitted
  }
  // Compatibility for deployments that still use the previous settings.
  const primaryName = process.env.ADMIN_USERNAME || 'admin'
  const primaryKey = process.env.ADMIN_API_KEY
  let permitted = false
  if (primaryKey) permitted = equal(actual, await digest(primaryKey)) && equal(username, primaryName)
  for (const account of configured) {
    const passwordMatches = equal(actual, account.passwordHash)
    const usernameMatches = equal(username, account.username)
    if (passwordMatches && usernameMatches) permitted = true
  }
  return permitted
}

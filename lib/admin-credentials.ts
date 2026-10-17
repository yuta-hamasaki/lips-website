// Shared by Edge middleware and Node routes. Never import into client components.
type AdminAccount = { username: string; passwordHash: string }

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
  const configured = accounts()
  if (configured === null) return false
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
  // Preserve the original admin password, now bound to its documented username.
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

// Shared by Edge middleware and server routes. Never import into client components.
export const ADMIN_COOKIE = 'lips_admin_session'
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60
const encoder = new TextEncoder()

async function signingKey() {
  if (process.env.NODE_ENV === 'production' && (process.env.ADMIN_SESSION_SECRET?.length ?? 0) < 32) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 random characters in production')
  }
  if (![process.env.ADMIN_1_PASSWORD, process.env.ADMIN_1_PASSWORD_HASH, process.env.ADMIN_2_PASSWORD,
    process.env.ADMIN_2_PASSWORD_HASH, process.env.ADMIN_API_KEY, process.env.ADMIN_ACCOUNTS_JSON?.replace(/^\[\]$/, '')].some(Boolean)) {
    throw new Error('Administrator credentials are not configured')
  }
  // Credential changes invalidate existing sessions. No extra secret setup is required.
  const settings = [process.env.ADMIN_SESSION_SECRET, process.env.ADMIN_1_USERNAME, process.env.ADMIN_1_PASSWORD, process.env.ADMIN_1_PASSWORD_HASH,
    process.env.ADMIN_2_USERNAME, process.env.ADMIN_2_PASSWORD, process.env.ADMIN_2_PASSWORD_HASH,
    process.env.ADMIN_USERNAME, process.env.ADMIN_API_KEY, process.env.ADMIN_ACCOUNTS_JSON]
  const secret = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(settings)))
  return crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function createAdminSession(now = Date.now()): Promise<string> {
  const payload = `${Math.floor(now / 1000) + ADMIN_SESSION_SECONDS}.${crypto.randomUUID()}`
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(payload))
  return `${payload}.${Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('')}`
}

export async function verifyAdminSession(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || token.length > 200) return false
  const match = token.match(/^(\d+)\.([a-f0-9-]{36})\.([a-f0-9]{64})$/)
  if (!match) return false
  const expiry = Number(match[1])
  if (expiry <= Math.floor(now / 1000) || expiry > Math.floor(now / 1000) + ADMIN_SESSION_SECONDS) return false
  const signature = Uint8Array.from(match[3].match(/../g)!, byte => parseInt(byte, 16))
  try {
    return await crypto.subtle.verify('HMAC', await signingKey(), signature, encoder.encode(`${match[1]}.${match[2]}`))
  } catch { return false }
}

import 'server-only'

export function appUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL
  if (!value) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  const url = new URL(value)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('NEXT_PUBLIC_APP_URL must be an origin URL')
  if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Production requires a public HTTPS URL')
  return url.origin
}

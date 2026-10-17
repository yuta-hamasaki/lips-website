export function readCheckInToken(value: string): string {
  const trimmed = value.trim()
  if (/^[A-Za-z0-9_-]{43}$/.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/admin/check-in') return ''
    const token = url.searchParams.get('token') ?? ''
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : ''
  } catch { return '' }
}

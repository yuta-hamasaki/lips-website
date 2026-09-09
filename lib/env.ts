import 'server-only'

export function appUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL
  if (!value) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  return value.replace(/\/$/, '')
}

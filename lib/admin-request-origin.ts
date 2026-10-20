import type { NextRequest } from 'next/server'

// Accept this deployment's origin as well as its configured public origin.
// Local development may use a different port from NEXT_PUBLIC_APP_URL.
export function adminRequestOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return null
  const allowed = new Set<string>()
  if (process.env.NODE_ENV !== 'production') allowed.add(request.nextUrl.origin)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try { allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin) } catch { /* Use the request origin if configuration is invalid. */ }
  }
  return allowed.has(origin) ? origin : null
}

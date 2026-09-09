import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const expected = process.env.ADMIN_API_KEY
  const auth = request.headers.get('authorization')
  let supplied = ''
  if (auth?.startsWith('Basic ')) {
    try { supplied = atob(auth.slice(6)).split(':', 2)[1] ?? '' } catch { supplied = '' }
  }
  if (expected && supplied === expected) return NextResponse.next()
  return new NextResponse('Admin authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="LIPS Admin", charset="UTF-8"', 'Cache-Control': 'no-store' } })
}

export const config = { matcher: ['/admin/:path*', '/api/check-in'] }

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/login') return NextResponse.next()
  const authenticated = await isAdminRequest(request)
  if (request.nextUrl.pathname === '/api/check-in' && !authenticated) {
    return NextResponse.json({ result: 'UNAUTHORIZED' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  const loginUrl = new URL('/admin/login', process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_APP_URL || request.url : request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
  const response = authenticated ? NextResponse.next() : NextResponse.redirect(loginUrl)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

export const config = { matcher: ['/admin/:path*', '/api/check-in'] }

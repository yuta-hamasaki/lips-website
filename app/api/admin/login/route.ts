import { allowAdminLogin } from '@/lib/admin-login-limit'
import { adminReturnPath } from '@/lib/admin-return-path'
import { adminRequestOrigin } from '@/lib/admin-request-origin'
import { NextResponse, type NextRequest } from 'next/server'
import { authenticateAdmin } from '@/lib/admin-credentials'
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, createAdminSession } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  const origin = adminRequestOrigin(request)
  if (!origin) return new NextResponse('Forbidden', { status: 403 })
  if (Number(request.headers.get('content-length') || 0) > 8192) return new NextResponse('Request too large', { status: 413 })
  const form = await request.formData().catch(() => null)
  if (!form) return new NextResponse('Invalid form', { status: 400 })
  const destination = adminReturnPath(form.get('next'))
  const username = form.get('username')
  const password = form.get('password')
  if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(username) ||
      typeof password !== 'string' || password.length > 1024) return new NextResponse('Invalid credentials', { status: 400 })
  try {
    if (!await allowAdminLogin(username)) {
      const response = NextResponse.redirect(new URL(`/admin/login?limited=1&next=${encodeURIComponent(destination)}`, origin), 303)
      response.headers.set('Retry-After', '900')
      return response
    }
  } catch {
    console.error('Admin login rate limit unavailable; check database migrations')
    return new NextResponse('Login temporarily unavailable. Please contact support.', { status: 503, headers: { 'Retry-After': '60' } })
  }
  if (!await authenticateAdmin(`Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`)) {
    const retry = new URL('/admin/login', origin)
    retry.searchParams.set('error', '1')
    retry.searchParams.set('next', destination)
    return NextResponse.redirect(retry, 303)
  }
  const response = NextResponse.redirect(new URL(destination, origin), 303)
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(ADMIN_COOKIE, await createAdminSession(), {
    httpOnly: true, secure: new URL(origin).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: ADMIN_SESSION_SECONDS,
  })
  return response
}

import { adminRequestOrigin } from '@/lib/admin-request-origin'
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/admin-session'

export async function POST(request: NextRequest) {
  const origin = adminRequestOrigin(request)
  if (!origin) return new NextResponse('Forbidden', { status: 403 })
  const response = request.headers.get('accept') === 'application/json'
    ? NextResponse.json({ loggedOut: true })
    : NextResponse.redirect(new URL('/', origin), 303)
  response.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, secure: new URL(origin).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 0 })
  response.headers.set('Cache-Control', 'no-store')
  return response
}

import { NextResponse, type NextRequest } from 'next/server'

import { authenticateAdmin } from '@/lib/admin-credentials'

export async function middleware(request: NextRequest) {
  if (await authenticateAdmin(request.headers.get('authorization'))) return NextResponse.next()
  return new NextResponse('Admin authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="LIPS Admin", charset="UTF-8"', 'Cache-Control': 'no-store' } })
}

export const config = { matcher: ['/admin/:path*', '/api/check-in'] }

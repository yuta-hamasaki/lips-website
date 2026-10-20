import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'

export function isAdminRequest(request: NextRequest): Promise<boolean> {
  return verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)
}

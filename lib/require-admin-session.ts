import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/admin-session'

export async function requireAdminSession() {
  if (!await verifyAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) redirect('/admin/login')
}

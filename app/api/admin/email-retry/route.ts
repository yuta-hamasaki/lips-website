import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { adminRequestOrigin } from '@/lib/admin-request-origin'
import { prisma } from '@/lib/prisma'
import { sendTicketEmailOnce } from '@/lib/tickets/send-ticket-email'

export async function POST(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const origin = adminRequestOrigin(request)
  if (!origin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const data = await request.formData().catch(() => null)
  const orderId = data?.get('orderId')
  if (typeof orderId !== 'string' || orderId.length > 100) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } })
  if (!order || order.paymentStatus !== 'PAID') return NextResponse.json({ error: 'Order unavailable' }, { status: 409 })
  try {
    await sendTicketEmailOnce(orderId)
    return NextResponse.redirect(new URL('/admin/operations', origin), 303)
  } catch {
    console.error('Manual ticket email retry failed', { orderId })
    return NextResponse.redirect(new URL('/admin/operations?error=1', origin), 303)
  }
}

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { checkInRequestFailure } from '@/lib/check-in-request'

export async function POST(request: NextRequest) {
  if (!await isAdminRequest(request)) return NextResponse.json({ result: 'UNAUTHORIZED' }, { status: 401 })
  const failure = checkInRequestFailure(request)
  if (failure) return NextResponse.json({ result: failure.result }, { status: failure.status })
  const body = await request.json().catch(() => null) as { qrToken?: unknown; eventId?: unknown; confirm?: unknown } | null
  if (!body || typeof body.qrToken !== 'string' || typeof body.eventId !== 'string') return NextResponse.json({ result: 'INVALID_REQUEST' }, { status: 400 })
  const ticket = await prisma.ticket.findUnique({ where: { qrToken: body.qrToken }, include: { event: true, order: { include: { customer: true } } } })
  if (!ticket) return NextResponse.json({ result: 'NOT_FOUND' }, { status: 404 })
  if (ticket.eventId !== body.eventId) return NextResponse.json({ result: 'WRONG_EVENT', event: { id: ticket.event.id, title: ticket.event.title } }, { status: 409 })
  if (ticket.order.paymentStatus !== 'PAID') return NextResponse.json({ result: 'UNPAID' }, { status: 409 })
  if (ticket.status === 'USED') return NextResponse.json({ result: 'ALREADY_USED', usedAt: ticket.usedAt })
  if (ticket.status === 'CANCELLED') return NextResponse.json({ result: 'CANCELLED' }, { status: 409 })
  if (body.confirm !== true) return NextResponse.json({ result: 'VALID', ticket: { id: ticket.id.slice(-8).toUpperCase(), customerName: ticket.holderName, eventName: ticket.event.title } })
  const updated = await prisma.ticket.updateMany({ where: { id: ticket.id, status: 'VALID', order: { paymentStatus: 'PAID' } }, data: { status: 'USED', usedAt: new Date() } })
  if (updated.count === 0) {
    const current = await prisma.ticket.findUnique({ where: { id: ticket.id }, include: { order: { select: { paymentStatus: true } } } })
    if (current?.order.paymentStatus === 'REFUNDED') return NextResponse.json({ result: 'UNPAID' }, { status: 409 })
    return NextResponse.json({ result: current?.status === 'USED' ? 'ALREADY_USED' : 'CANCELLED', usedAt: current?.usedAt }, { status: 409 })
  }
  const checkedIn = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })
  return NextResponse.json({ result: 'USED', usedAt: checkedIn.usedAt })
}

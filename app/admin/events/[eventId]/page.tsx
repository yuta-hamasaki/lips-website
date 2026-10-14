import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { adminDate, revenueByCurrency } from '@/lib/admin-format'
import AdminTicketList from '@/components/AdminTicketList'

export const dynamic = 'force-dynamic'

export default async function AdminEventPage({ params }: { params: { eventId: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.eventId }, include: { orders: { orderBy: { createdAt: 'desc' }, include: { customer: true, tickets: true } }, tickets: true } })
  if (!event) notFound()
  const paid = event.orders.filter(order => order.paymentStatus === 'PAID')
  const stats = [
    ['発行チケット', event.tickets.length],
    ['未入場', event.tickets.filter(t => t.status === 'VALID').length],
    ['入場済み', event.tickets.filter(t => t.status === 'USED').length],
    ['キャンセル', event.tickets.filter(t => t.status === 'CANCELLED').length],
    ['顧客数', new Set(event.orders.map(o => o.customerId)).size],
    ['売上（返金除外）', revenueByCurrency(paid)],
    ['返金額', revenueByCurrency(event.orders.filter(o => o.paymentStatus === 'REFUNDED'))],
  ]
  const tickets = event.orders.flatMap(order => order.tickets.map(ticket => ({ id: ticket.id, name: order.customer.name, email: order.customer.email, date: adminDate(order.createdAt), status: ticket.status, paymentStatus: order.paymentStatus, accessToken: ticket.accessToken, qrToken: ticket.qrToken, usedAt: ticket.usedAt ? adminDate(ticket.usedAt) : null })))
  return <main className="admin-page"><section><nav className="admin-actions"><a href="/admin/events">← EVENTS</a><a href="/admin/customers">CUSTOMERS</a><a href="/admin/check-in">CHECK-IN</a></nav><p className="micro">EVENT REPORT</p><h1>{event.title}</h1><div className="stats">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><h2>購入者・入場管理</h2><AdminTicketList eventId={event.id} tickets={tickets}/></section></main>
}

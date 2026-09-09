import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminEventPage({ params }: { params: { eventId: string } }) {
  const event = await prisma.event.findUnique({ where: { id: params.eventId }, include: { orders: { orderBy: { createdAt: 'desc' }, include: { customer: true, tickets: true } }, tickets: true } })
  if (!event) notFound()
  const counts = { valid: event.tickets.filter((t) => t.status === 'VALID').length, used: event.tickets.filter((t) => t.status === 'USED').length, cancelled: event.tickets.filter((t) => t.status === 'CANCELLED').length }
  const paid = event.orders.filter((order) => order.paymentStatus === 'PAID')
  const revenue = paid.reduce((sum, order) => sum + order.amount, 0)
  return <main className="admin-page"><section><a href="/admin/events">← ALL EVENTS</a><p className="micro">EVENT REPORT</p><h1>{event.title}</h1><div className="stats"><div><span>SOLD</span><strong>{event.tickets.length}</strong></div><div><span>VALID</span><strong>{counts.valid}</strong></div><div><span>USED</span><strong>{counts.used}</strong></div><div><span>CANCELLED</span><strong>{counts.cancelled}</strong></div><div><span>REVENUE</span><strong>{new Intl.NumberFormat('en-CA', { style: 'currency', currency: paid[0]?.currency ?? 'CAD' }).format(revenue / 100)}</strong></div></div><div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ORDER DATE</th><th>TICKET ID</th><th>STATUS</th><th>STRIPE SESSION</th></tr></thead><tbody>{event.orders.flatMap((order) => order.tickets.map((ticket) => <tr key={ticket.id}><td>{order.customer.name}</td><td>{order.customer.email}</td><td>{order.createdAt.toLocaleString()}</td><td>#{ticket.id.slice(-8).toUpperCase()}</td><td>{ticket.status}</td><td>{order.stripeSessionId}</td></tr>))}</tbody></table></div></section></main>
}

import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({ orderBy: { eventDate: 'desc' }, include: { orders: { where: { paymentStatus: 'PAID' } }, _count: { select: { tickets: true } }, tickets: { where: { status: 'USED' }, select: { id: true } } } })
  return <main className="admin-page"><header><a className="brand" href="/">Lips<span>.</span></a><nav><Link href="/admin/events">EVENTS</Link><Link href="/admin/check-in">CHECK-IN</Link></nav></header><section><p className="micro">ADMINISTRATION</p><h1>Events</h1><div className="admin-grid">{events.map((event) => { const revenue = event.orders.reduce((sum, order) => sum + order.amount, 0); const currency = event.orders[0]?.currency ?? 'cad'; return <Link className="admin-event" href={`/admin/events/${event.id}`} key={event.id}><h2>{event.title}</h2><p>{event.eventDate?.toLocaleDateString() ?? 'TBA'}</p><dl><div><dt>SOLD</dt><dd>{event._count.tickets}</dd></div><div><dt>CHECKED IN</dt><dd>{event.tickets.length}</dd></div><div><dt>REVENUE</dt><dd>{new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(revenue / 100)}</dd></div></dl></Link> })}</div></section></main>
}

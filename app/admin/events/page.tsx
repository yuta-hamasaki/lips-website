import { requireAdminSession } from '@/lib/require-admin-session'
import AdminSalesChart from '@/components/AdminSalesChart'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { revenueByCurrency } from '@/lib/admin-format'

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  await requireAdminSession()
  const events = await prisma.event.findMany({ orderBy: { eventDate: 'desc' }, include: { orders: { where: { paymentStatus: 'PAID' } }, _count: { select: { tickets: true } }, tickets: { where: { status: 'USED' }, select: { id: true } } } })
  return <main className="admin-page"><header><Link className="brand" href="/">Lips<span>.</span></Link><nav><Link href="/admin/events">EVENTS</Link><Link href="/admin/customers">CUSTOMERS</Link><Link href="/admin/check-in">CHECK-IN</Link></nav></header><section><p className="micro">ADMINISTRATION</p><h1>Events</h1><div className="stats"><div><span>売上（返金除外）</span><strong>{revenueByCurrency(events.flatMap(event => event.orders))}</strong></div><div><span>イベント数</span><strong>{events.length}</strong></div></div>{!events.length && <p>イベントはチケット購入手続きが開始されると登録されます。</p>}<AdminSalesChart now={new Date().toISOString()} orders={events.flatMap(event => event.orders.map(order => ({ amount: order.amount, currency: order.currency, paymentStatus: order.paymentStatus, createdAt: order.createdAt.toISOString() })))}/><div className="admin-grid">{events.map((event) => { return <Link className="admin-event" href={`/admin/events/${event.id}`} key={event.id}><h2>{event.title}</h2><p>{event.eventDate?.toLocaleDateString() ?? 'TBA'}</p><dl><div><dt>SOLD</dt><dd>{event._count.tickets}</dd></div><div><dt>CHECKED IN</dt><dd>{event.tickets.length}</dd></div><div><dt>REVENUE</dt><dd>{revenueByCurrency(event.orders)}</dd></div></dl></Link> })}</div></section></main>
}

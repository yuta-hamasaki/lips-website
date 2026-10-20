import { requireAdminSession } from '@/lib/require-admin-session'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { adminDate, revenueByCurrency } from '@/lib/admin-format'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage({ searchParams: routeInput }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminSession()
  const searchParams = await routeInput
  const query = (searchParams.q ?? '').trim().slice(0, 200)
  const customers = await prisma.customer.findMany({
    where: query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { orders: { select: { amount: true, currency: true, paymentStatus: true, event: { select: { id: true, title: true } } } } },
  })
  return <main className="admin-page"><section><nav className="admin-actions"><Link href="/admin/events">← EVENTS</Link><Link href="/admin/check-in">CHECK-IN</Link></nav><p className="micro">ADMINISTRATION</p><h1>Customers</h1><form className="admin-filters"><label>顧客検索<input name="q" defaultValue={query} placeholder="名前・メールアドレス" maxLength={200}/></label><button type="submit">検索</button><Link href="/admin/customers">クリア</Link></form><p>{customers.length} customers</p><div className="table-wrap"><table><thead><tr><th>名前</th><th>メール</th><th>登録日時 (Vancouver)</th><th>注文数</th><th>購入総額（返金除外）</th><th>イベント</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td>{customer.name}</td><td>{customer.email}</td><td>{adminDate(customer.createdAt)}</td><td>{customer.orders.length}</td><td>{revenueByCurrency(customer.orders.filter(o => o.paymentStatus === 'PAID'))}</td><td>{Array.from(new Map(customer.orders.map(o => [o.event.id, o.event])).values()).map(event => <div key={event.id}><Link href={`/admin/events/${event.id}`}>{event.title}</Link></div>)}</td></tr>)}</tbody></table>{!customers.length && <p>該当する顧客はいません。決済完了後に顧客が登録されます。</p>}</div></section></main>
}

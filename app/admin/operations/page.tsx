import { requireAdminSession } from '@/lib/require-admin-session'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdminSession()
  const { error } = await searchParams
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000)
  const orders = await prisma.order.findMany({ where: { paymentStatus: 'PAID', ticketEmailStatus: { not: 'SENT' } },
    orderBy: { createdAt: 'asc' }, take: 100, include: { event: { select: { title: true } } } })
  return <main className="admin-page"><section><Link href="/admin/events">← EVENTS</Link><p className="micro">OPERATIONS</p><h1>メール送信状況</h1>
    <p>未送信・失敗・送信中の注文を最大100件表示します。送信中の注文は10分経過すると再試行できます。</p>
    <p>24時間を超える再試行は、先にResendの送信履歴をご確認ください。重複メールになる可能性があります。</p>
    {error && <p role="alert">送信に失敗しました。送信元の設定・Resendの状況をご確認ください。</p>}
    {!orders.length && <p>未送信の注文はありません。</p>}
    <div className="table-wrap"><table><thead><tr><th>注文</th><th>イベント</th><th>状態</th><th>操作</th></tr></thead><tbody>{orders.map(order => {
      const ready = order.ticketEmailStatus !== 'SENDING' || (order.ticketEmailClaimedAt ?? order.updatedAt) < staleBefore
      return <tr key={order.id}><td>{order.id}</td><td>{order.event.title}</td><td>{order.ticketEmailStatus}</td><td><form action="/api/admin/email-retry" method="post"><input type="hidden" name="orderId" value={order.id}/><button className="outline-button" disabled={!ready}>メールを再試行</button></form></td></tr>
    })}</tbody></table></div>
  </section></main>
}

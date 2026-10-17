'use client'

import { useId, useMemo, useState } from 'react'
import { dailySales, type SalesOrder } from '@/lib/admin-sales'

export default function AdminSalesChart({ orders, now }: { orders: SalesOrder[]; now: string }) {
  const titleId = useId()
  const descriptionId = useId()
  const currencies = [...new Set(orders.map(order => order.currency.toUpperCase()))].sort()
  const [currency, setCurrency] = useState(currencies[0] ?? 'CAD')
  const [days, setDays] = useState(90)
  const [metric, setMetric] = useState<'amount' | 'count'>('amount')
  const points = useMemo(() => dailySales(orders, currency, days, new Date(now)), [orders, currency, days, now])
  const money = (amount: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount / 100)
  const total = points.reduce((sum, point) => sum + point.amount, 0)
  const count = points.reduce((sum, point) => sum + point.count, 0)
  const maximum = Math.max(1, ...points.map(point => point[metric]))
  const ticks = [...new Set([0, Math.round(maximum / 2), maximum])]
  const x = (index: number) => 64 + index * 800 / Math.max(1, points.length - 1)
  const y = (value: number) => 236 - value / maximum * 190
  const line = points.map((point, index) => `${x(index)},${y(point[metric])}`).join(' ')
  return <section className="sales-chart" aria-labelledby={titleId}>
    <div className="sales-heading"><div><p className="micro">SALES ANALYTICS</p><h2 id={titleId}>売上の推移</h2></div><div className="sales-summary"><strong>{money(total)}</strong><span>{count} 注文 · 返金除外</span></div></div>
    <div className="admin-filters sales-filters">
      <label>期間<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={30}>直近30日</option><option value={90}>直近90日</option><option value={365}>直近1年</option><option value={0}>全期間（最大10年）</option></select></label>
      <label>通貨<select value={currency} onChange={event => setCurrency(event.target.value)}>{(currencies.length ? currencies : ['CAD']).map(value => <option key={value}>{value}</option>)}</select></label>
      <label>表示<select value={metric} onChange={event => setMetric(event.target.value as 'amount' | 'count')}><option value="amount">日別売上</option><option value="count">日別注文数</option></select></label>
    </div>
    <p id={descriptionId} className="sales-note">購入日をVancouver時間で集計。決済済み注文のみ・Stripe手数料控除前。通貨は合算しません。</p>
    {!count ? <p className="sales-empty">この期間の決済済み注文はありません。</p> : <svg viewBox="0 0 900 280" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      {ticks.map(value => <g key={value}><line x1="64" x2="864" y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".15"/><text x="54" y={y(value) + 4} textAnchor="end">{metric === 'count' ? value : money(value)}</text></g>)}
      <polyline points={line} fill="none" stroke="#ff8fc7" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
      {points.filter(point => point[metric] > 0).map(point => <circle key={point.date} cx={x(points.indexOf(point))} cy={y(point[metric])} r="3" fill="#ff3292"><title>{point.date}: {money(point.amount)} / {point.count} 注文</title></circle>)}
      {points.map((point, index) => (index === 0 || index === points.length - 1 || index % Math.max(1, Math.ceil(points.length / 5)) === 0) && <text key={point.date} x={x(index)} y="266" textAnchor="middle">{point.date.slice(5)}</text>)}
    </svg>}
    <details><summary>日別の数値を見る</summary><div className="table-wrap"><table><thead><tr><th>購入日</th><th>売上（{currency}）</th><th>注文数</th></tr></thead><tbody>{points.filter(point => point.count).map(point => <tr key={point.date}><td>{point.date}</td><td>{money(point.amount)}</td><td>{point.count}</td></tr>)}</tbody></table>{!count && <p>該当データなし</p>}</div></details>
  </section>
}

export type SalesOrder = { amount: number; currency: string; createdAt: string; paymentStatus: string }
export type SalesPoint = { date: string; amount: number; count: number }
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Vancouver', year: 'numeric', month: '2-digit', day: '2-digit' })
export function salesDay(value: Date): string {
  const parts = dayFormatter.formatToParts(value)
  const get = (type: string) => parts.find(part => part.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function dailySales(orders: SalesOrder[], currency: string, days: number, now: Date): SalesPoint[] {
  const today = salesDay(now)
  const paid = orders.filter(order => order.paymentStatus === 'PAID' && order.currency.toUpperCase() === currency.toUpperCase())
  const earliest = paid.map(order => salesDay(new Date(order.createdAt))).sort()[0] ?? today
  const end = Date.parse(`${today}T00:00:00Z`)
  // Bound chart cardinality even when all-history data spans many years.
  const start = days ? end - (days - 1) * 86400000 : Math.max(Date.parse(`${earliest}T00:00:00Z`), end - 3650 * 86400000)
  const byDay = new Map<string, SalesPoint>()
  for (let date = start; date <= end; date += 86400000) {
    const day = new Date(date).toISOString().slice(0, 10)
    byDay.set(day, { date: day, amount: 0, count: 0 })
  }
  for (const order of paid) {
    const point = byDay.get(salesDay(new Date(order.createdAt)))
    if (point) { point.amount += order.amount; point.count++ }
  }
  return [...byDay.values()]
}

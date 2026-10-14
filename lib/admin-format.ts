export function revenueByCurrency(orders: { amount: number; currency: string }[]) {
  const totals = new Map<string, number>()
  for (const order of orders) {
    const currency = order.currency.toUpperCase()
    totals.set(currency, (totals.get(currency) ?? 0) + order.amount)
  }
  return Array.from(totals, ([currency, amount]) => new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(amount / 100)).join(' / ') || '—'
}

export function adminDate(date: Date) {
  return date.toLocaleString('en-CA', { timeZone: 'America/Vancouver' })
}

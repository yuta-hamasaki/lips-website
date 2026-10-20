import type { CmsEvent } from '@/lib/events/types'

export function ticketSalesOpen(event: CmsEvent, now = Date.now()): boolean {
  const start = event.ticketSalesStart ? Date.parse(event.ticketSalesStart) : -Infinity
  const end = event.ticketSalesEnd ? Date.parse(event.ticketSalesEnd) : Infinity
  const eventStart = Date.parse(event.date)
  return event.status === 'published' && Boolean(event.stripePriceId) &&
    !Number.isNaN(start) && !Number.isNaN(end) && Number.isFinite(eventStart) &&
    now >= start && now < end && now < eventStart
}

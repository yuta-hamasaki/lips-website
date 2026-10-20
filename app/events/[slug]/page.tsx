import Link from 'next/link'
import { ticketSalesOpen } from '@/lib/ticket-sales'
import { notFound } from 'next/navigation'
import CheckoutButton from '@/components/CheckoutButton'
import SiteFooter from '@/components/SiteFooter'
import { getEventBySlug } from '@/lib/events/get-event'
import { syncEvent } from '@/lib/events/sync-event'

export const revalidate = 60

export default async function EventPage({ params: routeInput }: { params: Promise<{ slug: string }> }) {
  const params = await routeInput
  const event = await getEventBySlug(params.slug)
  if (!event || event.status === 'draft') notFound()
  await syncEvent(event)
  const salesOpen = ticketSalesOpen(event)
  return <><main className="event-page"><Link className="brand" href="/">Lips<span>.</span></Link><section className="event-hero" style={event.heroImage ? { backgroundImage: `linear-gradient(90deg,rgba(5,3,5,.95),rgba(5,3,5,.25)),url(${event.heroImage.url})` } : undefined}><p className="micro">{event.ticketLabel ?? 'GENERAL ADMISSION'}</p><h1>{event.title}</h1><p className="event-description">{event.description}</p><dl><div><dt>DATE</dt><dd>{new Date(event.date).toLocaleDateString('en-CA', { dateStyle: 'long', timeZone: 'America/Vancouver' })}</dd></div><div><dt>DOORS / START</dt><dd>{event.doorsOpen ?? 'TBA'} / {event.startTime ?? 'TBA'}</dd></div><div><dt>VENUE</dt><dd>{event.venue}<br/><small>{event.address}</small></dd></div></dl><CheckoutButton eventSlug={event.slug} disabled={!salesOpen}/>{!salesOpen && <p className="sales-note">Ticket sales are not currently open.</p>}</section></main><SiteFooter/></>
}

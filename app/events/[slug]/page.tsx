import { notFound } from 'next/navigation'
import CheckoutButton from '@/components/CheckoutButton'
import SiteFooter from '@/components/SiteFooter'
import { getEventBySlug } from '@/lib/events/get-event'
import { syncEvent } from '@/lib/events/sync-event'

export const revalidate = 60

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await getEventBySlug(params.slug)
  if (!event || event.status === 'draft') notFound()
  // Content remains available even if Neon is temporarily unavailable. The
  // checkout endpoint performs the same sync strictly before taking payment.
  try { await syncEvent(event) }
  catch (error) { console.error('Event database sync failed during page render', { microCmsId: event.id, message: error instanceof Error ? error.message : 'Unknown error' }) }
  const now = Date.now()
  const salesOpen = event.status === 'published' && !!event.stripePriceId && (!event.ticketSalesStart || now >= new Date(event.ticketSalesStart).getTime()) && (!event.ticketSalesEnd || now <= new Date(event.ticketSalesEnd).getTime())
  return <><main className="event-page"><a className="brand" href="/">Lips<span>.</span></a><section className="event-hero" style={event.heroImage ? { backgroundImage: `linear-gradient(90deg,rgba(5,3,5,.95),rgba(5,3,5,.25)),url(${event.heroImage.url})` } : undefined}><p className="micro">{event.ticketLabel ?? 'GENERAL ADMISSION'}</p><h1>{event.title}</h1><p className="event-description">{event.description}</p><dl><div><dt>DATE</dt><dd>{new Date(event.date).toLocaleDateString('en-CA', { dateStyle: 'long', timeZone: 'America/Vancouver' })}</dd></div><div><dt>DOORS / START</dt><dd>{event.doorsOpen ?? 'TBA'} / {event.startTime ?? 'TBA'}</dd></div><div><dt>VENUE</dt><dd>{event.venue}<br/><small>{event.address}</small></dd></div></dl><CheckoutButton eventSlug={event.slug} disabled={!salesOpen}/>{!salesOpen && <p className="sales-note">Ticket sales are not currently open.</p>}</section></main><SiteFooter/></>
}

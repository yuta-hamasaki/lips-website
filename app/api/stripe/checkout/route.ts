import { NextResponse } from 'next/server'
import { appUrl } from '@/lib/env'
import { getEventBySlug } from '@/lib/events/get-event'
import { syncEvent } from '@/lib/events/sync-event'
import { getStripe } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { eventSlug?: unknown }
    if (typeof body.eventSlug !== 'string' || !body.eventSlug) return NextResponse.json({ error: 'Invalid event.' }, { status: 400 })
    const cmsEvent = await getEventBySlug(body.eventSlug)
    if (!cmsEvent || cmsEvent.status !== 'published') return NextResponse.json({ error: 'Event not found.' }, { status: 404 })
    if (!cmsEvent.stripePriceId) return NextResponse.json({ error: 'Tickets are not available.' }, { status: 409 })
    const now = Date.now()
    if ((cmsEvent.ticketSalesStart && now < new Date(cmsEvent.ticketSalesStart).getTime()) || (cmsEvent.ticketSalesEnd && now > new Date(cmsEvent.ticketSalesEnd).getTime())) return NextResponse.json({ error: 'Ticket sales are closed.' }, { status: 409 })
    const event = await syncEvent(cmsEvent)
    const baseUrl = appUrl()
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: cmsEvent.stripePriceId, quantity: 1 }],
      customer_creation: 'always',
      custom_fields: [{ key: 'ticket_holder_name', label: { type: 'custom', custom: 'Ticket holder name' }, type: 'text', optional: false }],
      metadata: { eventId: event.id, microCmsEventId: cmsEvent.id, eventSlug: cmsEvent.slug },
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/events/${encodeURIComponent(cmsEvent.slug)}?checkout=cancelled`,
    })
    if (!session.url) throw new Error('Stripe did not return a Checkout URL')
    console.info('Checkout created', { stripeSessionId: session.id, eventId: event.id })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout creation failed', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: 'Unable to start checkout.' }, { status: 500 })
  }
}

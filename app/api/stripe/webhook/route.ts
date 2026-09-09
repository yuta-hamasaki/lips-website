import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { issueTicketForSession } from '@/lib/tickets/create-ticket'
import { sendTicketEmailOnce } from '@/lib/tickets/send-ticket-email'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 })
  let event: Stripe.Event
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret) }
  catch (error) { console.warn('Invalid Stripe webhook signature', error instanceof Error ? error.message : 'Unknown error'); return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 }) }
  if (event.type !== 'checkout.session.completed') return NextResponse.json({ received: true })

  try {
    const session = await getStripe().checkout.sessions.retrieve(event.data.object.id, { expand: ['line_items.data.price'] })
    const order = await issueTicketForSession(session)
    console.info('Ticket issuance complete', { webhookEventId: event.id, stripeSessionId: session.id, eventId: order.eventId, orderId: order.id, ticketId: order.tickets[0]?.id })
    try { await sendTicketEmailOnce(order.id) }
    catch (emailError) { console.error('Ticket email failed', { webhookEventId: event.id, orderId: order.id, message: emailError instanceof Error ? emailError.message : 'Unknown error' }) }
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing failed', { webhookEventId: event.id, message: error instanceof Error ? error.message : 'Unknown error' })
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}

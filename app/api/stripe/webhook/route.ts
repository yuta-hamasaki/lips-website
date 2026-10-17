import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { issueTicketForSession } from '@/lib/tickets/create-ticket'
import { sendTicketEmailOnce } from '@/lib/tickets/send-ticket-email'
import { revokeFullyRefundedPayment } from '@/lib/tickets/refund-ticket'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 })
  let event: Stripe.Event
  try { event = getStripe().webhooks.constructEvent(await request.text(), signature, secret) }
  catch { console.warn('Invalid Stripe webhook signature'); return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 }) }
  if (event.type !== 'checkout.session.completed' && event.type !== 'charge.refunded') return NextResponse.json({ received: true })

  try {
    if (event.type === 'charge.refunded') {
      await revokeFullyRefundedPayment(event.data.object, event.id)
      return NextResponse.json({ received: true })
    }
    const session = await getStripe().checkout.sessions.retrieve(event.data.object.id, { expand: ['line_items.data.price'] })
    const order = await issueTicketForSession(session)
    console.info('Ticket issuance complete', { webhookEventId: event.id, stripeSessionId: session.id, eventId: order.eventId, orderId: order.id, ticketId: order.tickets[0]?.id })
    try { await sendTicketEmailOnce(order.id) }
    catch (emailError) {
      console.error('Ticket email failed', { webhookEventId: event.id, orderId: order.id, stage: 'email' })
      throw emailError
    }
    return NextResponse.json({ received: true })
  } catch {
    console.error('Webhook processing failed', { webhookEventId: event.id, stage: 'processing' })
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}

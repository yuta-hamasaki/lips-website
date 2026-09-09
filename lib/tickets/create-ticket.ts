import 'server-only'
import { Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import { getEventById, getEventBySlug } from '@/lib/events/get-event'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from './generate-token'

function holderName(session: Stripe.Checkout.Session): string | null {
  const field = session.custom_fields?.find((item) => item.key === 'ticket_holder_name')
  return field?.text?.value?.trim() || session.customer_details?.name?.trim() || null
}

export async function issueTicketForSession(session: Stripe.Checkout.Session) {
  const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id }, include: { tickets: true } })
  if (existing) return existing
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') throw new Error('PAYMENT_NOT_COMPLETE')

  const { eventId, microCmsEventId, eventSlug } = session.metadata ?? {}
  if (!eventId || !microCmsEventId || !eventSlug) throw new Error('INVALID_EVENT_METADATA')
  const dbEvent = await prisma.event.findUnique({ where: { id: eventId } })
  if (!dbEvent || dbEvent.microCmsId !== microCmsEventId || dbEvent.slug !== eventSlug) throw new Error('EVENT_MISMATCH')
  const cmsEvent = await getEventById(microCmsEventId) ?? await getEventBySlug(eventSlug)
  if (!cmsEvent || cmsEvent.id !== dbEvent.microCmsId || cmsEvent.slug !== dbEvent.slug) throw new Error('EVENT_MISMATCH')
  const paidPriceId = session.line_items?.data[0]?.price?.id
  if (!cmsEvent.stripePriceId || paidPriceId !== cmsEvent.stripePriceId) throw new Error('PRICE_MISMATCH')

  const email = session.customer_details?.email?.trim().toLowerCase()
  const name = holderName(session)
  if (!email) throw new Error('CUSTOMER_EMAIL_MISSING')
  if (!name) throw new Error('CUSTOMER_NAME_MISSING')
  if (session.amount_total === null || !session.currency) throw new Error('PAYMENT_DETAILS_MISSING')
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({ where: { email }, create: { email, name }, update: { name } })
      return tx.order.create({
        data: {
          customerId: customer.id, eventId: dbEvent.id, stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId, amount: session.amount_total!, currency: session.currency!,
          tickets: { create: { eventId: dbEvent.id, accessToken: generateSecureToken(), qrToken: generateSecureToken() } },
        },
        include: { tickets: true },
      })
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const duplicate = await prisma.order.findUnique({ where: { stripeSessionId: session.id }, include: { tickets: true } })
      if (duplicate) return duplicate
    }
    throw error
  }
}

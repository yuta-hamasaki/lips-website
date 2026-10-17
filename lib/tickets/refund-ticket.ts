import 'server-only'
import type Stripe from 'stripe'
import { serializableTransaction } from '@/lib/serializable-transaction'

export async function revokeFullyRefundedPayment(charge: Stripe.Charge, stripeEventId: string): Promise<void> {
  // Partial-refund admission policy is intentionally not implemented.
  if (!charge.refunded || charge.amount <= 0 || charge.amount_refunded !== charge.amount) return
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  // Charges outside this application's PaymentIntent-based Checkout are ignored.
  if (!paymentIntentId) return

  await serializableTransaction(async (tx) => {
    if (await tx.refundedPayment.findUnique({ where: { paymentIntentId } })) return
    await tx.refundedPayment.create({ data: { paymentIntentId, stripeEventId } })
    await tx.order.updateMany({
      where: { stripePaymentIntentId: paymentIntentId, paymentStatus: 'PAID' },
      data: { paymentStatus: 'REFUNDED' },
    })
    // Preserve usedAt as an attendance audit timestamp, including used tickets.
    await tx.ticket.updateMany({
      where: { order: { stripePaymentIntentId: paymentIntentId }, status: { not: 'CANCELLED' } },
      data: { status: 'CANCELLED' },
    })
  })
}

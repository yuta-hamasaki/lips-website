import TicketActions from '@/components/TicketActions'
import TicketCard from '@/components/TicketCard'
import { getTicketByAccessToken } from '@/lib/tickets/get-ticket'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { issueTicketForSession } from '@/lib/tickets/create-ticket'

export const dynamic = 'force-dynamic'

export default async function SuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const sessionId = searchParams.session_id
  let order = sessionId ? await prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: { tickets: true } }) : null

  if (!order && sessionId) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price'] })
      order = await issueTicketForSession(session)
    } catch (error) {
      console.error('Unable to issue ticket on success page', { sessionId, message: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  const issuedTicket = order?.tickets[0]
  const ticket = issuedTicket ? await getTicketByAccessToken(issuedTicket.accessToken) : null

  return <main className="center-page ticket-page">
    <section className="payment-heading" aria-labelledby="payment-title">
      <p className="micro">{ticket ? 'PAYMENT RECEIVED' : 'TICKET STATUS'}</p>
      <h1 id="payment-title">{ticket ? "You're on the list." : 'Checking your ticket.'}</h1>
      <p>{ticket ? 'Your ticket is ready. Save it and present the QR code at the door.' : 'Your ticket is not available yet. If payment is complete, check your email or refresh this page in a moment.'}</p>
    </section>
    {ticket ? <TicketCard ticket={ticket} /> : <TicketActions />}
  </main>
}

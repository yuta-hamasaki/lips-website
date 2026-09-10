import Link from 'next/link'
import TicketActions from '@/components/TicketActions'
import { appUrl } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { issueTicketForSession } from '@/lib/tickets/create-ticket'
import { generateQrDataUrl } from '@/lib/tickets/generate-qr'

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

  const ticket = order?.tickets[0]
  const ticketPath = ticket ? `/ticket/${ticket.accessToken}` : null
  const ticketUrl = ticketPath ? `${appUrl()}${ticketPath}` : null
  const qr = ticket ? await generateQrDataUrl(ticket.qrToken) : null

  return <main className="center-page"><section className="notice-card success-card"><p className="micro">PAYMENT RECEIVED</p><h1>Thank you.</h1>{ticket && ticketPath && ticketUrl && qr ? <><p>Your ticket is ready. Save this QR code or open the ticket URL below.</p><div className="success-qr"><img src={qr} alt="Ticket check-in QR code" width="240" height="240"/></div><a className="ticket-url" href={ticketPath}>{ticketUrl}</a><div className="success-actions"><Link className="outline-button" href={ticketPath}>VIEW TICKET</Link><TicketActions accessToken={ticket.accessToken}/></div></> : <><p>We could not display your ticket yet. It will arrive by email shortly.</p><p className="sales-note">Please refresh this page in a moment.</p><TicketActions /></>}</section></main>
}

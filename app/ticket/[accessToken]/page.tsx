import TicketActions from '@/components/TicketActions'
import { generateQrDataUrl } from '@/lib/tickets/generate-qr'
import { getTicketByAccessToken } from '@/lib/tickets/get-ticket'

export const dynamic = 'force-dynamic'

export default async function TicketPage({ params }: { params: { accessToken: string } }) {
  const ticket = await getTicketByAccessToken(params.accessToken)

  if (!ticket) {
    return (
      <main className="center-page">
        <section className="notice-card">
          <p className="micro">LIPS TICKETING</p>
          <h1>Ticket Not Found</h1>
          <p>This ticket link is invalid or no longer available.</p>
          <TicketActions />
        </section>
      </main>
    )
  }

  const qr = await generateQrDataUrl(ticket.qrToken)

  return (
    <main className="center-page ticket-page">
      <article className={`ticket-card status-${ticket.status.toLowerCase()}`}>
        <div className="ticket-data">
          <a className="brand" href="/">Lips<span>.</span></a>
          <p className="micro">{ticket.event.ticketLabel ?? 'GENERAL ADMISSION'}</p>
          <h1>{ticket.event.title}</h1>
          <dl>
            <div><dt>DATE</dt><dd>{ticket.event.eventDate?.toLocaleDateString('en-CA', { dateStyle: 'long', timeZone: 'America/Vancouver' }) ?? 'TBA'}</dd></div>
            <div><dt>VENUE</dt><dd>{ticket.event.venue ?? 'TBA'}</dd></div>
            <div><dt>GUEST</dt><dd>{ticket.order.customer.name}</dd></div>
            <div><dt>TICKET</dt><dd>#{ticket.id.slice(-8).toUpperCase()}</dd></div>
          </dl>
          <strong className="ticket-status">{ticket.status}</strong>
        </div>
        <div className="ticket-qr">
          <img src={qr} alt="Check-in QR code" width="260" height="260" />
          <p>Present this code at the door.</p>
        </div>
      </article>
      <TicketActions accessToken={params.accessToken} />
    </main>
  )
}

import TicketActions from './TicketActions'
import { generateQrDataUrl } from '@/lib/tickets/generate-qr'
import type { getTicketByAccessToken } from '@/lib/tickets/get-ticket'

export default async function TicketCard({ ticket }: { ticket: NonNullable<Awaited<ReturnType<typeof getTicketByAccessToken>>> }) {
  const qr = await generateQrDataUrl(ticket.qrToken)
  const details = {
    title: ticket.event.title,
    label: ticket.event.ticketLabel ?? 'GENERAL ADMISSION',
    date: ticket.event.eventDate?.toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Vancouver' }) ?? 'TBA',
    venue: ticket.event.venue ?? 'TBA',
    name: ticket.order.customer.name,
    email: ticket.order.customer.email,
    number: ticket.id.slice(-8).toUpperCase(),
    status: ticket.status,
    qr,
  }
  return <div className="ticket-container">
    <article className={`ticket-card status-${ticket.status.toLowerCase()}`}>
      <div className="ticket-data">
        <a className="brand" href="/">Lips<span>.</span></a>
        <p className="micro">{details.label}</p>
        <h1>{details.title}</h1>
        <dl>
          <div><dt>DATE · VANCOUVER TIME</dt><dd>{details.date}</dd></div>
          <div><dt>VENUE</dt><dd>{details.venue}</dd></div>
          <div><dt>GUEST</dt><dd>{details.name}</dd></div>
          <div><dt>EMAIL</dt><dd>{details.email}</dd></div>
          <div><dt>TICKET</dt><dd>#{details.number}</dd></div>
        </dl>
        <strong className="ticket-status">{details.status}</strong>
      </div>
      <div className="ticket-qr">
        <p className="qr-label">YOUR ENTRY TICKET</p>
        <img src={qr} alt="Check-in QR code" width="260" height="260" />
        <p>{ticket.status === 'VALID' ? 'Present this code at the door.' : ticket.status === 'USED' ? 'This ticket has already been used.' : 'This ticket has been cancelled.'}</p>
      </div>
    </article>
    <TicketActions ticket={details} />
    <p className="ticket-save-note">Save your complete ticket before arrival. Keep your QR code private.</p>
  </div>
}

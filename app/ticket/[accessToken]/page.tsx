import TicketActions from '@/components/TicketActions'
import TicketCard from '@/components/TicketCard'
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

  return <main className="center-page ticket-page"><TicketCard ticket={ticket} /></main>
}

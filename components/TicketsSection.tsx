import { ArrowRight } from 'lucide-react'
import type { HeroEvent } from '@/lib/content/types'

export default function TicketsSection({ event }: { event: HeroEvent }) {
  return <section className="tickets" id="tickets"><p>{event.isFallback ? 'THE NEXT NIGHT IS TAKING SHAPE' : `${event.date} · ${event.city}`}</p><h2>MEET US ON THE<br/><em>OTHER SIDE.</em></h2><a className="ticket-button" href={event.ticketUrl ?? '#contact'}>{event.ticketUrl ? 'GET TICKETS' : 'STAY IN THE LOOP'} <ArrowRight/></a></section>
}

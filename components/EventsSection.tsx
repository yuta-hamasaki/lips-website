import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import type { Event } from '@/lib/content/types'

const dateFormatter = new Intl.DateTimeFormat('en-CA', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Vancouver' })

export default function EventsSection({ events, now }: { events: Event[]; now: Date }) {
  const upcoming = events.filter((event) => new Date(event.startsAt) >= now).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))

  return <section className="events" id="events">
    <div className="section-head"><div><span>01 /</span><h2>EVENTS</h2></div><p>Meet us after dark.<br/>Vancouver, BC.</p></div>
    {upcoming.length ? <div className="event-list">{upcoming.map((event, index) => <article className="event-card" key={event.id}>
      <span className="event-index">0{index + 1}</span><div><small>NEXT EVENT</small><h3>{event.title}</h3><p>{event.description}</p></div>
      <dl><div><dt><CalendarDays size={14}/> DATE</dt><dd>{dateFormatter.format(new Date(event.startsAt))}</dd></div><div><dt><MapPin size={14}/> LOCATION</dt><dd>{event.venue}, {event.city}</dd></div></dl>
      {event.ticketUrl && <a href={event.ticketUrl}>GET TICKETS <ArrowRight size={18}/></a>}
    </article>)}</div> : <div className="event-empty"><span>THE NEXT CHAPTER</span><h3>COMING <em>SOON.</em></h3><p>Another night is taking shape somewhere in Vancouver.<br/>Stay close. You&apos;ll hear it here first.</p><a href="#contact">STAY IN THE LOOP <ArrowRight size={18}/></a></div>}
  </section>
}

import { ArrowRight, Globe2, Menu } from 'lucide-react'
import type { HeroEvent } from '@/lib/content/types'
import HeroVisuals from './HeroVisuals'

export default function HeroSection({ event }: { event: HeroEvent }) {
  return <section className="hero" id="home">
    <div className="hero-image" /><div className="hero-gradient" /><HeroVisuals />
    <header>
      <a className="brand" href="#home">Lips<span>.</span></a>
      <nav>{['Home', 'About', 'Events', 'Lineup', 'Experience', 'Info'].map(item => <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>)}</nav>
      <div className="header-right"><span>MUSIC</span><span>PEOPLE</span><span>CULTURE</span><Globe2 size={20}/><a className="outline-button" href={event.ticketUrl ?? '#events'}>{event.ticketUrl ? 'GET TICKETS' : 'VIEW EVENTS'} <ArrowRight size={16}/></a></div>
      <button className="menu" aria-label="Open menu"><Menu/></button>
    </header>
    <div className="eyebrow">GOOD<br/>MUSIC<br/>BETTER<br/>PEOPLE</div>
    <div className="hero-copy">
      <p className="micro">{event.eyebrow.toUpperCase()}</p><h1>Lips</h1><p className="genre">R&amp;B / HIP-HOP NIGHT</p>
      <div className="event-meta">
        <div><strong>{event.date}</strong><small>{event.timing}</small></div>
        <div><strong>{event.venue}</strong><small>{event.city}</small></div>
        <div><strong>{event.isFallback ? 'AFTER' : 'A HIGHER'}</strong><small>{event.isFallback ? 'DARK' : 'KIND OF NIGHT'}</small></div>
      </div>
      <a className="ticket-button" href={event.ticketUrl ?? '#events'}>{event.ticketUrl ? 'GET TICKETS' : 'STAY IN THE LOOP'} <ArrowRight size={20}/></a>
    </div>
    <div className="reality"><span>SAME BEAT,</span><span>DIFFERENT</span><span>REALITY.</span><i/></div>
    <div className="scroll-note"><span>SCROLL TO DISCOVER</span><b/></div>
  </section>
}

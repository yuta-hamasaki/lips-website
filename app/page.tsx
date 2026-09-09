import EventsSection from '@/components/EventsSection'
import ExperienceSection from '@/components/ExperienceSection'
import HeroSection from '@/components/HeroSection'
import LineupSection from '@/components/LineupSection'
import SiteFooter from '@/components/SiteFooter'
import TicketsSection from '@/components/TicketsSection'
import { getNearestUpcomingEvent, toHeroEvent } from '@/lib/content/events'
import { getArtists, getEvents } from '@/lib/content/source'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [events, artists] = await Promise.all([getEvents(), getArtists()])
  const now = new Date()
  const heroEvent = toHeroEvent(getNearestUpcomingEvent(events, now))

import dynamic from 'next/dynamic'
import { ArrowRight, Globe2, Menu, Play, Plus, Sparkles } from 'lucide-react'

const StarField = dynamic(() => import('./StarField'), { ssr: false })
const HeroLip = dynamic(() => import('./HeroLip'), { ssr: false })

const artists = [
  { name: 'DJ SORA', role: 'MIDNIGHT SET', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85' },
  { name: 'ANDY DAVIS', role: 'LIVE PERFORMANCE', image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=900&q=85' },
  { name: 'KAI LUNE', role: 'SPECIAL GUEST', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85' },
]

export default function Home() {
  return <main>
    <section className="hero" id="home">
      <div className="hero-image" />
      <div className="hero-gradient" />
      <StarField />
      <HeroLip />
      <header>
        <a className="brand" href="#home">Lips<span>.</span></a>
        <nav>{['Home', 'About', 'Lineup', 'Experience', 'Info'].map(item => <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>)}</nav>
        <div className="header-right"><span>MUSIC</span><span>PEOPLE</span><span>CULTURE</span><Globe2 size={20}/><a className="outline-button" href="#tickets">GET TICKETS <ArrowRight size={16}/></a></div>
        <button className="menu" aria-label="Open menu"><Menu/></button>
      </header>

      <div className="eyebrow">GOOD<br/>MUSIC<br/>BETTER<br/>PEOPLE</div>
      <div className="hero-copy">
        <p className="micro">VANCOUVER · 2026</p>
        <h1>Lips</h1>
        <p className="genre">R&amp;B / HIP-HOP NIGHT</p>
        <div className="event-meta">
          <div><strong>JUNE 26</strong><small>FRI · 10PM — LATE</small></div>
          <div><strong>CABANA</strong><small>VANCOUVER</small></div>
          <div><strong>A HIGHER</strong><small>KIND OF NIGHT</small></div>
        </div>
        <a className="ticket-button" href="#tickets">GET TICKETS <ArrowRight size={20}/></a>
      </div>
      <div className="reality"><span>SAME BEAT,</span><span>DIFFERENT</span><span>REALITY.</span><i/></div>
      <div className="scroll-note"><span>SCROLL TO DISCOVER</span><b/></div>
    </section>

    <section className="lineup" id="lineup">
      <div className="section-head"><div><span>02 /</span><h2>THE LINEUP</h2></div><p>From slow-burn R&amp;B to future-facing hip-hop.<br/>Three artists. One electric night.</p></div>
      <div className="artist-grid">
        {artists.map((artist, i) => <article className="artist" key={artist.name}>
          <img src={artist.image} alt={artist.name} />
          <div className="artist-shade"/><span className="artist-no">0{i + 1}</span>
          <div className="artist-info"><small>{artist.role}</small><h3>{artist.name}</h3></div>
          <button aria-label={`More about ${artist.name}`}><Plus/></button>
        </article>)}
      </div>
    </section>

    <section className="experience" id="experience">
      <div className="orb orb-one"/><div className="orb orb-two"/>
      <div className="experience-copy"><span>03 / THE EXPERIENCE</span><h2>SAME BEAT.<br/><em>DIFFERENT REALITY.</em></h2><p>Step through the portal. Lose yourself in sound, light and the people who make the night unforgettable.</p><button className="play"><i><Play fill="currentColor"/></i> WATCH THE FILM</button></div>
      <div className="experience-card"><Sparkles/><p>A NIGHT BEYOND<br/>THE ORDINARY.</p><span>VANCOUVER, BC<br/>CABANA</span></div>
    </section>

    <section className="tickets" id="tickets"><p>ONE NIGHT ONLY · JUNE 26</p><h2>MEET US ON THE<br/><em>OTHER SIDE.</em></h2><a className="ticket-button" href="#home">GET TICKETS <ArrowRight/></a></section>
    <footer><a className="brand" href="#home">Lips<span>.</span></a><p>© 2026 LIPS. MUSIC PEOPLE CULTURE.</p><div><a href="#contact">CONTACT</a><a href="#privacy">PRIVACY</a><a href="#instagram">INSTAGRAM</a></div><span>GOOD MUSIC BETTER PEOPLE ✦</span></footer>
  </main>
}

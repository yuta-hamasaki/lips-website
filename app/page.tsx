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

  return <main>
    <HeroSection event={heroEvent}/>
    <EventsSection events={events} now={now}/>
    <LineupSection artists={artists}/>
    <ExperienceSection/>
    <TicketsSection event={heroEvent}/>
    <SiteFooter/>
  </main>
}

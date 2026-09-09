import EventsSection from '@/components/EventsSection'
import ExperienceSection from '@/components/ExperienceSection'
import HeroSection from '@/components/HeroSection'
import LineupSection from '@/components/LineupSection'
import SiteFooter from '@/components/SiteFooter'
import TicketsSection from '@/components/TicketsSection'
import { getNearestUpcomingEvent, toHeroEvent } from '@/lib/content/events'
import { getArtists, getEvents } from '@/lib/content/source'

// Re-evaluate event dates on every request so an expired event automatically
// falls back to the "coming soon" state. `revalidate` is used instead of the
// route option named `dynamic`, which can collide with `next/dynamic` imports
// when this file is merged with older hero implementations.
export const revalidate = 0

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

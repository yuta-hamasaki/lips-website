import type { Event, HeroEvent } from './types'

const DEFAULT_HERO_EVENT: HeroEvent = {
  eyebrow: 'Vancouver · after dark',
  date: 'COMING SOON',
  timing: 'NIGHT — LATE',
  venue: 'SOMEWHERE',
  city: 'VANCOUVER',
  message: 'A HIGHER KIND OF NIGHT',
  isFallback: true,
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'America/Vancouver',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Vancouver',
})

export function getNearestUpcomingEvent(events: Event[], now = new Date()): Event | undefined {
  return events
    .filter((event) => new Date(event.startsAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]
}

export function toHeroEvent(event?: Event): HeroEvent {
  if (!event) return DEFAULT_HERO_EVENT
  const startsAt = new Date(event.startsAt)

  return {
    eyebrow: event.eyebrow ?? `${event.city} · next event`,
    date: dateFormatter.format(startsAt).toUpperCase(),
    timing: `${timeFormatter.format(startsAt).toUpperCase()} — LATE`,
    venue: event.venue.toUpperCase(),
    city: event.city.toUpperCase(),
    message: event.title.toUpperCase(),
    ticketUrl: event.ticketUrl,
    isFallback: false,
  }
}

import type { Artist, Event } from './types'
import { getPublishedEvents, hasMicroCmsConfig } from '@/lib/events/get-event'

// Temporary local content source. Keep consumers behind these functions so this
// file can be replaced by a microCMS client without changing page components.
const artists: Artist[] = [
  { id: 'dj-sora', name: 'DJ SORA', role: 'MIDNIGHT SET', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85' },
  { id: 'andy-davis', name: 'ANDY DAVIS', role: 'LIVE PERFORMANCE', image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=900&q=85' },
  { id: 'kai-lune', name: 'KAI LUNE', role: 'SPECIAL GUEST', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85' },
]

export async function getEvents(): Promise<Event[]> {
  if (!hasMicroCmsConfig()) return []
  const events = await getPublishedEvents()
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startTime ? `${event.date.slice(0, 10)}T${event.startTime}` : event.date,
    venue: event.venue,
    city: event.address?.split(',').at(-1)?.trim() || 'Vancouver',
    description: event.description,
    ticketUrl: `/events/${event.slug}`,
    status: 'published',
  }))
}

export async function getArtists(): Promise<Artist[]> {
  return artists
}

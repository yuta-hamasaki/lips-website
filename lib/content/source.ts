import type { Artist, Event } from './types'

// Temporary local content source. Keep consumers behind these functions so this
// file can be replaced by a microCMS client without changing page components.
const events: Event[] = [
  {
    id: 'lips-vancouver-2026',
    title: 'Lips — R&B / Hip-Hop Night',
    startsAt: '2026-06-26T22:00:00-07:00',
    venue: 'Cabana',
    city: 'Vancouver',
    eyebrow: 'One night only',
    description: 'Slow-burn R&B, future-facing hip-hop, and a room full of good people.',
    ticketUrl: '#tickets',
    status: 'published',
  },
]

const artists: Artist[] = [
  { id: 'dj-sora', name: 'DJ SORA', role: 'MIDNIGHT SET', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85' },
  { id: 'andy-davis', name: 'ANDY DAVIS', role: 'LIVE PERFORMANCE', image: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=900&q=85' },
  { id: 'kai-lune', name: 'KAI LUNE', role: 'SPECIAL GUEST', image: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85' },
]

export async function getEvents(): Promise<Event[]> {
  return events.filter((event) => event.status === 'published')
}

export async function getArtists(): Promise<Artist[]> {
  return artists
}

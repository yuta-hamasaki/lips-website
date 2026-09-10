import type { Artist, Event } from './types'
import { getArtists as getMicroCmsArtists } from './artists'
import { getPublishedEvents, hasMicroCmsConfig } from '@/lib/events/get-event'
import type { CmsEvent } from '@/lib/events/types'

export async function getEvents(): Promise<Event[]> {
  if (!hasMicroCmsConfig()) return []
  let events: CmsEvent[]
  try { events = await getPublishedEvents() }
  catch (error) {
    console.error('Unable to load homepage events', error instanceof Error ? error.message : 'Unknown error')
    return []
  }
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.date,
    venue: event.venue,
    city: event.address?.split(',').at(-1)?.trim() || 'Vancouver',
    description: event.description,
    ticketUrl: `/events/${event.slug}`,
    status: 'published',
  }))
}

export async function getArtists(): Promise<Artist[]> {
  if (!hasMicroCmsConfig()) return []
  try { return await getMicroCmsArtists() }
  catch (error) {
    console.error('Unable to load homepage artists', error instanceof Error ? error.message : 'Unknown error')
    return []
  }
}

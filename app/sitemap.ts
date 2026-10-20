import type { MetadataRoute } from 'next'
import { getEvents, getArtists } from '@/lib/content/source'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (!base?.startsWith('https://')) return []
  const [events, artists] = await Promise.all([getEvents(), getArtists()])
  // The public ticketUrl contains the event slug; CMS ids are not event page paths.
  const urls = ['/', '/privacy', '/terms', ...events.map(event => event.ticketUrl).filter((path): path is string => Boolean(path)), ...artists.map(artist => `/artists/${encodeURIComponent(artist.id)}`)]
  return urls.map(path => ({ url: `${base}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.6 }))
}

import 'server-only'
import type { CmsEvent } from './types'

type MicroCmsList<T> = { contents: T[]; totalCount: number }

function config() {
  const domain = process.env.MICROCMS_SERVICE_DOMAIN
  const apiKey = process.env.MICROCMS_API_KEY
  const endpoint = process.env.MICROCMS_EVENTS_ENDPOINT ?? 'events'
  if (!domain || !apiKey) throw new Error('microCMS is not configured')
  return { domain, apiKey, endpoint }
}

export function hasMicroCmsConfig(): boolean {
  return Boolean(process.env.MICROCMS_SERVICE_DOMAIN && process.env.MICROCMS_API_KEY)
}

async function microCmsFetch<T>(path: string): Promise<T> {
  const { domain, apiKey } = config()
  const response = await fetch(`https://${domain}.microcms.io/api/v1/${path}`, {
    headers: { 'X-MICROCMS-API-KEY': apiKey },
    next: { revalidate: 60 },
  })
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id')
    console.error('microCMS request failed', { status: response.status, endpoint: path.split('?')[0], requestId })
    if (response.status === 404) throw new Error('MICROCMS_NOT_FOUND')
    if (response.status === 401 || response.status === 403) throw new Error('MICROCMS_AUTH_FAILED')
    throw new Error(`MICROCMS_REQUEST_FAILED_${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function getEventBySlug(slug: string): Promise<CmsEvent | null> {
  const { endpoint } = config()
  const query = new URLSearchParams({ filters: `slug[equals]${slug}`, limit: '1' })
  const result = await microCmsFetch<MicroCmsList<MicroCmsRecord>>(`${endpoint}?${query}`)
  return result.contents[0] ? normalizeEvent(result.contents[0]) : null
}

export async function getEventById(id: string): Promise<CmsEvent | null> {
  const { endpoint } = config()
  try { return normalizeEvent(await microCmsFetch<MicroCmsRecord>(`${endpoint}/${encodeURIComponent(id)}`)) }
  catch (error) { if (error instanceof Error && error.message === 'MICROCMS_NOT_FOUND') return null; throw error }
}

export async function getPublishedEvents(): Promise<CmsEvent[]> {
  const { endpoint } = config()
  // microCMS already returns only published content. Avoid requiring projects
  // to define an additional custom `status` field just to list events.
  const query = new URLSearchParams({ limit: '100' })
  const result = await microCmsFetch<MicroCmsList<MicroCmsRecord>>(`${endpoint}?${query}`)
  return result.contents
    .map(normalizeEvent)
    .filter((event): event is CmsEvent => event !== null && event.status === 'published')
    .sort((first, second) => Date.parse(first.date) - Date.parse(second.date))
}

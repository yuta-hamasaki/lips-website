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
    if (response.status === 404) throw new Error('EVENT_NOT_FOUND')
    throw new Error(`microCMS request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

export async function getEventBySlug(slug: string): Promise<CmsEvent | null> {
  const { endpoint } = config()
  const query = new URLSearchParams({ filters: `slug[equals]${slug}`, limit: '1' })
  const result = await microCmsFetch<MicroCmsList<CmsEvent>>(`${endpoint}?${query}`)
  return result.contents[0] ?? null
}

export async function getEventById(id: string): Promise<CmsEvent | null> {
  const { endpoint } = config()
  try { return await microCmsFetch<CmsEvent>(`${endpoint}/${encodeURIComponent(id)}`) }
  catch (error) { if (error instanceof Error && error.message === 'EVENT_NOT_FOUND') return null; throw error }
}

export async function getPublishedEvents(): Promise<CmsEvent[]> {
  const { endpoint } = config()
  const query = new URLSearchParams({ filters: 'status[equals]published', limit: '100', orders: 'date' })
  return (await microCmsFetch<MicroCmsList<CmsEvent>>(`${endpoint}?${query}`)).contents
}

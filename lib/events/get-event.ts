import 'server-only'
import type { CmsEvent, CmsImage, CmsPerson } from './types'

type MicroCmsList<T> = { contents: T[]; totalCount: number }
type MicroCmsRecord = Record<string, unknown> & { id?: unknown }

function config() {
  const domain = process.env.MICROCMS_SERVICE_DOMAIN?.trim()
  const apiKey = process.env.MICROCMS_API_KEY?.trim()
  const endpoint = process.env.MICROCMS_EVENTS_ENDPOINT?.trim() || 'events'
  if (!domain || !apiKey) throw new Error('MICROCMS_CONFIG_MISSING')
  return { domain: domain.replace(/^https?:\/\//, '').replace(/\.microcms\.io\/?$/, ''), apiKey, endpoint }
}

export function hasMicroCmsConfig(): boolean {
  return Boolean(process.env.MICROCMS_SERVICE_DOMAIN?.trim() && process.env.MICROCMS_API_KEY?.trim())
}

function optionalString(record: MicroCmsRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
}

function people(value: unknown): CmsPerson[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((item) => {
    if (typeof item === 'string') return [{ name: item }]
    if (!item || typeof item !== 'object') return []
    const record = item as MicroCmsRecord
    const name = optionalString(record, 'name')
    return name ? [{ id: optionalString(record, 'id'), name }] : []
  })
}

function image(value: unknown): CmsImage | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as MicroCmsRecord
  const url = optionalString(record, 'url')
  return url ? { url, width: typeof record.width === 'number' ? record.width : undefined, height: typeof record.height === 'number' ? record.height : undefined } : undefined
}

function normalizeEvent(record: MicroCmsRecord): CmsEvent | null {
  const id = optionalString(record, 'id')
  const title = optionalString(record, 'title', 'eventTitle')
  const slug = optionalString(record, 'slug')
  const date = optionalString(record, 'date', 'eventDate')
  const venue = optionalString(record, 'venue')
  const invalidDate = Boolean(date && Number.isNaN(Date.parse(date)))
  if (!id || !title || !slug || !date || invalidDate || !venue) {
    console.warn('Skipped invalid microCMS event', { microCmsId: id ?? 'unknown', missingRequiredFields: { title: !title, slug: !slug, date: !date, validDate: invalidDate, venue: !venue } })
    return null
  }
  // microCMS select fields return arrays, even for a single selection.
  const statusValue = record.status ?? record.eventStatus
  const rawStatus = (Array.isArray(statusValue) && statusValue.length === 1 ? statusValue[0] : statusValue)
  const normalizedStatus = typeof rawStatus === 'string' ? rawStatus.trim().toLowerCase() : undefined
  const status: CmsEvent['status'] = statusValue == null
    ? 'published'
    : normalizedStatus === 'published' || normalizedStatus === 'sold-out' || normalizedStatus === 'cancelled'
      ? normalizedStatus
      : 'draft'
  return {
    id, title, slug, date, venue, status,
    description: optionalString(record, 'description') ?? '',
    doorsOpen: optionalString(record, 'doorsOpen'),
    startTime: optionalString(record, 'startTime'),
    address: optionalString(record, 'address'),
    heroImage: image(record.heroImage),
    artists: people(record.artists),
    djs: people(record.djs),
    ticketSalesStart: optionalString(record, 'ticketSalesStart'),
    ticketSalesEnd: optionalString(record, 'ticketSalesEnd'),
    stripePriceId: optionalString(record, 'stripePriceId', 'stripePriceID'),
    ticketLabel: optionalString(record, 'ticketLabel'),
  }
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

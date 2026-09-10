import 'server-only'
import type { Artist } from './types'

type MicroCmsList<T> = { contents: T[] }
type MicroCmsRecord = Record<string, unknown> & { id?: unknown }

function config() {
  const domain = process.env.MICROCMS_SERVICE_DOMAIN?.trim()
  const apiKey = process.env.MICROCMS_API_KEY?.trim()
  const endpoint = process.env.MICROCMS_ARTISTS_ENDPOINT?.trim() || 'artists'
  if (!domain || !apiKey) throw new Error('MICROCMS_CONFIG_MISSING')
  return { domain: domain.replace(/^https?:\/\//, '').replace(/\.microcms\.io\/?$/, ''), apiKey, endpoint }
}

function string(record: MicroCmsRecord, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeArtist(record: MicroCmsRecord): Artist | null {
  const id = string(record, 'id')
  const name = string(record, 'name')
  const imageRecord = record.img && typeof record.img === 'object' ? record.img as MicroCmsRecord : null
  const image = imageRecord ? string(imageRecord, 'url') : undefined
  if (!id || !name || !image) {
    console.warn('Skipped invalid microCMS artist', { microCmsId: id ?? 'unknown', missingRequiredFields: { name: !name, img: !image } })
    return null
  }
  return {
    id, name, image,
    imageWidth: typeof imageRecord?.width === 'number' ? imageRecord.width : undefined,
    imageHeight: typeof imageRecord?.height === 'number' ? imageRecord.height : undefined,
    description: string(record, 'desc') ?? '',
    role: string(record, 'role'),
  }
}

async function microCmsFetch<T>(path: string): Promise<T> {
  const { domain, apiKey } = config()
  const response = await fetch(`https://${domain}.microcms.io/api/v1/${path}`, {
    headers: { 'X-MICROCMS-API-KEY': apiKey },
    next: { revalidate: 60 },
  })
  if (!response.ok) {
    if (response.status === 404) throw new Error('MICROCMS_NOT_FOUND')
    throw new Error(`MICROCMS_REQUEST_FAILED_${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function getArtists(): Promise<Artist[]> {
  const { endpoint } = config()
  const query = new URLSearchParams({ limit: '100' })
  const result = await microCmsFetch<MicroCmsList<MicroCmsRecord>>(`${endpoint}?${query}`)
  return result.contents.map(normalizeArtist).filter((artist): artist is Artist => artist !== null)
}

export async function getArtistById(id: string): Promise<Artist | null> {
  const { endpoint } = config()
  try { return normalizeArtist(await microCmsFetch<MicroCmsRecord>(`${endpoint}/${encodeURIComponent(id)}`)) }
  catch (error) {
    if (error instanceof Error && error.message === 'MICROCMS_NOT_FOUND') return null
    throw error
  }
}

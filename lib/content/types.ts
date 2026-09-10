/** Content shapes mirror the fields that will later be returned by microCMS. */
export type Event = {
  id: string
  title: string
  startsAt: string
  venue: string
  city: string
  eyebrow?: string
  description: string
  ticketUrl?: string
  status: 'published' | 'draft'
}

export type Artist = {
  id: string
  name: string
  role?: string
  image: string
  imageWidth?: number
  imageHeight?: number
  description: string
  eventIds?: string[]
}

export type HeroEvent = {
  eyebrow: string
  date: string
  timing: string
  venue: string
  city: string
  message: string
  ticketUrl?: string
  isFallback: boolean
}

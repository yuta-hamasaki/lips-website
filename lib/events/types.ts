export type CmsImage = { url: string; width?: number; height?: number }
export type CmsPerson = { id?: string; name: string }

export type CmsEvent = {
  id: string
  title: string
  slug: string
  description: string
  date: string
  doorsOpen?: string
  startTime?: string
  venue: string
  address?: string
  heroImage?: CmsImage
  artists?: CmsPerson[]
  djs?: CmsPerson[]
  ticketSalesStart?: string
  ticketSalesEnd?: string
  stripePriceId?: string
  ticketLabel?: string
  status: 'draft' | 'published' | 'sold-out' | 'cancelled'
}

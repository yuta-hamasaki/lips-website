import 'server-only'
import { prisma } from '@/lib/prisma'
import type { CmsEvent } from './types'

export async function syncEvent(event: CmsEvent) {
  return prisma.event.upsert({
    where: { microCmsId: event.id },
    create: { microCmsId: event.id, slug: event.slug, title: event.title, eventDate: new Date(event.date), venue: event.venue, ticketLabel: event.ticketLabel },
    update: { slug: event.slug, title: event.title, eventDate: new Date(event.date), venue: event.venue, ticketLabel: event.ticketLabel },
  })
}

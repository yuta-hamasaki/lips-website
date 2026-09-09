import 'server-only'
import { prisma } from '@/lib/prisma'

export function getTicketByAccessToken(accessToken: string) {
  return prisma.ticket.findUnique({
    where: { accessToken },
    include: { event: true, order: { include: { customer: true } } },
  })
}

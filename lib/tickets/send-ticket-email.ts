import 'server-only'
import { ticketEmailHtml } from '@/emails/ticket-email'
import { appUrl } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getResend } from '@/lib/resend'
import { generateQrBuffer } from '@/lib/tickets/generate-qr'

const ticketQrContentId = 'lips-ticket-qr'

export async function sendTicketEmailOnce(orderId: string): Promise<void> {
  const claimed = await prisma.order.updateMany({
    where: { id: orderId, ticketEmailStatus: { in: ['PENDING', 'FAILED'] } },
    data: { ticketEmailStatus: 'SENDING' },
  })
  if (claimed.count === 0) return

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true, event: true, tickets: true } })
  const ticket = order?.tickets[0]
  if (!order || !ticket) throw new Error('Ticket email data is missing')
  const baseUrl = appUrl()
  const ticketUrl = `${baseUrl}/ticket/${ticket.accessToken}`

  try {
    const qrImage = await generateQrBuffer(ticket.qrToken)
    const response = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'LIPS Tickets <onboarding@resend.dev>',
      to: order.customer.email,
      subject: 'Your LIPS Ticket is Ready',
      html: ticketEmailHtml({ customerName: order.customer.name, eventName: order.event.title, eventDate: order.event.eventDate, venue: order.event.venue, ticketUrl, qrImageSrc: `cid:${ticketQrContentId}` }),
      attachments: [{
        filename: `lips-ticket-${ticket.id.slice(-8).toUpperCase()}.png`,
        content: qrImage,
        contentId: ticketQrContentId,
      }],
    })
    if (response.error) throw new Error(response.error.message)
    await prisma.order.update({ where: { id: order.id }, data: { ticketEmailStatus: 'SENT', ticketEmailSentAt: new Date() } })
    console.info('Ticket email sent', { orderId: order.id, ticketId: ticket.id, emailResultId: response.data?.id })
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { ticketEmailStatus: 'FAILED' } })
    throw error
  }
}

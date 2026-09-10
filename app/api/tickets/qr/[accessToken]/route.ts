import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { checkInUrl } from '@/lib/tickets/generate-qr'
import { getTicketByAccessToken } from '@/lib/tickets/get-ticket'

export async function GET(_: Request, { params }: { params: { accessToken: string } }) {
  const ticket = await getTicketByAccessToken(params.accessToken)
  if (!ticket) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  const image = await QRCode.toBuffer(checkInUrl(ticket.qrToken), { type: 'png', width: 480, margin: 2 })
  return new NextResponse(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': 'attachment; filename="lips-ticket-qr.png"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

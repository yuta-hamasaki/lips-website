import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SuccessPage({ searchParams }: { searchParams: { session_id?: string } }) {
  const sessionId = searchParams.session_id
  const order = sessionId ? await prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: { tickets: true } }) : null
  return <main className="center-page"><section className="notice-card"><p className="micro">PAYMENT RECEIVED</p><h1>Thank you.</h1>{order?.tickets[0] ? <><p>Your ticket is ready.</p><Link className="ticket-button" href={`/ticket/${order.tickets[0].accessToken}`}>VIEW TICKET</Link></> : <><p>We are preparing your ticket. It will arrive by email shortly.</p><p className="sales-note">You may refresh this page in a moment.</p></>}</section></main>
}

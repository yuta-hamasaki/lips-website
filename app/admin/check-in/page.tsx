import Link from 'next/link'
import { requireAdminSession } from '@/lib/require-admin-session'
import CheckInConsole from '@/components/CheckInConsole'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function CheckInPage({ searchParams: routeInput }: { searchParams: Promise<{ token?: string }> }) {
  await requireAdminSession()
  const searchParams = await routeInput
  const events = await prisma.event.findMany({ orderBy: { eventDate: 'desc' }, select: { id: true, title: true } })
  return <main className="admin-page"><section><Link href="/admin/events">← EVENTS</Link><p className="micro">DOOR STAFF</p><h1>Check-in</h1><CheckInConsole events={events} initialToken={searchParams.token ?? ''}/></section></main>
}

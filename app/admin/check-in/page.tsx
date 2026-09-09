import CheckInConsole from '@/components/CheckInConsole'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function CheckInPage({ searchParams }: { searchParams: { token?: string } }) {
  const events = await prisma.event.findMany({ orderBy: { eventDate: 'desc' }, select: { id: true, title: true } })
  return <main className="admin-page"><section><a href="/admin/events">← EVENTS</a><p className="micro">DOOR STAFF</p><h1>Check-in</h1><CheckInConsole events={events} initialToken={searchParams.token ?? ''}/></section></main>
}

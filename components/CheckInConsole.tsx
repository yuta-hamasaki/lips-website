'use client'

import { useState } from 'react'

type EventOption = { id: string; title: string }
type CheckInResult = { result: string; usedAt?: string; ticket?: { id: string; customerName: string; eventName: string } }

export default function CheckInConsole({ events, initialToken }: { events: EventOption[]; initialToken: string }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [tokenInput, setTokenInput] = useState(initialToken)
  const [result, setResult] = useState<CheckInResult | null>(null)
  function readToken(value: string): string {
    const trimmed = value.trim()
    try { return new URL(trimmed).searchParams.get('token') ?? '' }
    catch { return trimmed }
  }
  const token = readToken(tokenInput)
  async function submit(confirm: boolean) {
    const response = await fetch('/api/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, qrToken: token, confirm }) })
    setResult(await response.json() as CheckInResult)
  }
  return <section className="checkin-console"><label>ACTIVE EVENT<select value={eventId} onChange={(event) => { setEventId(event.target.value); setResult(null) }}>{events.map((event) => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label><label>QR TOKEN OR SCANNED URL<input value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} autoComplete="off"/></label><button className="ticket-button" disabled={!eventId || !token} onClick={() => submit(false)}>VALIDATE</button>{result && <div className={`scan-result result-${result.result.toLowerCase()}`}><strong>{result.result.replace('_', ' ')}</strong>{result.ticket && <p>{result.ticket.customerName}<br/>Ticket #{result.ticket.id}</p>}{result.usedAt && <p>Checked in at {new Date(result.usedAt).toLocaleString()}</p>}{result.result === 'VALID' && <button className="ticket-button" onClick={() => submit(true)}>CONFIRM CHECK-IN</button>}</div>}</section>
}

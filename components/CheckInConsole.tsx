'use client'

import { useEffect, useRef, useState } from 'react'
import QrCamera from '@/components/QrCamera'
import { readCheckInToken } from '@/lib/check-in-token'

type EventOption = { id: string; title: string }
type CheckInResult = { result: string; usedAt?: string; ticket?: { id: string; customerName: string; eventName: string } }
const messages: Record<string, string> = {
  VALID: '入場できるチケットです', USED: 'チェックインが完了しました', ALREADY_USED: 'すでに入場済みです',
  WRONG_EVENT: '選択中のイベントと異なるチケットです', UNPAID: '返金済みのため入場できません', CANCELLED: 'キャンセルされたチケットです',
  NOT_FOUND: 'チケットが見つかりません', UNAUTHORIZED: '管理者として再ログインしてください', FORBIDDEN: '管理画面のURLを確認して開き直してください',
  INVALID_REQUEST: 'QRの内容を確認してください', UNSUPPORTED_MEDIA_TYPE: 'リクエスト形式が正しくありません', SERVER_CONFIGURATION_ERROR: '管理画面のURL設定を確認してください',
}
export default function CheckInConsole({ events, initialToken }: { events: EventOption[]; initialToken: string }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [tokenInput, setTokenInput] = useState(initialToken)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestVersion = useRef(0)
  const pending = useRef<AbortController | null>(null)
  const busyRef = useRef(false)
  const token = readCheckInToken(tokenInput)
  function reset() {
    requestVersion.current++
    pending.current?.abort()
    busyRef.current = false
    setBusy(false); setResult(null); setError('')
  }
  useEffect(() => () => { pending.current?.abort() }, [])
  async function submit(confirm: boolean, scanned?: string) {
    const qrToken = scanned ?? token
    if (!eventId || !qrToken || busyRef.current) return
    const version = ++requestVersion.current
    const controller = new AbortController()
    pending.current = controller
    busyRef.current = true
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/check-in', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'X-LIPS-Check-In': '1' }, body: JSON.stringify({ eventId, qrToken, confirm }) })
      const data = await response.json() as CheckInResult
      if (version !== requestVersion.current) return
      if (!data.result) throw new Error('Unexpected response')
      setResult(data)
    } catch {
      if (version === requestVersion.current && !controller.signal.aborted) setError('通信に失敗しました。処理結果を再確認してください。')
    } finally {
      if (version === requestVersion.current) { busyRef.current = false; setBusy(false) }
    }
  }
  function scanned(value: string) {
    const scannedToken = readCheckInToken(value)
    reset()
    if (!scannedToken) { setError('LIPSのチケットQRではありません。'); return }
    setTokenInput(scannedToken)
    void submit(false, scannedToken)
  }
  return <section className="checkin-console">
    <label>受付イベント<select value={eventId} disabled={busy} onChange={event => { reset(); setEventId(event.target.value) }}>{events.map(event => <option value={event.id} key={event.id}>{event.title}</option>)}</select></label>
    {!events.length && <p>受付対象のイベントがありません。</p>}
    <QrCamera key={eventId} disabled={!eventId || busy || result?.result === 'VALID'} onScan={scanned}/>
    <label>QRのURL・トークンを手動入力<input value={tokenInput} disabled={busy} onChange={event => { reset(); setTokenInput(event.target.value) }} autoComplete="off" spellCheck={false}/></label>
    <button className="ticket-button" disabled={!eventId || !token || busy} onClick={() => { void submit(false) }}>{busy ? '確認中…' : 'チケットを確認'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    {result && <div className={`scan-result result-${result.result.toLowerCase()}`} role="status" aria-live="polite"><strong>{messages[result.result] ?? '処理に失敗しました'}</strong>
      {result.ticket && <p>{result.ticket.customerName}<br/>{result.ticket.eventName}<br/>Ticket #{result.ticket.id}</p>}
      {result.usedAt && <p>入場日時: {new Date(result.usedAt).toLocaleString('ja-JP', { timeZone: 'America/Vancouver' })}</p>}
      {result.result === 'VALID' && <button className="ticket-button" disabled={busy} onClick={() => { void submit(true) }}>この保持者をチェックインする</button>}
      <button className="outline-button" disabled={busy} onClick={() => { reset(); setTokenInput('') }}>次のチケットを読み取る</button>
    </div>}
  </section>
}

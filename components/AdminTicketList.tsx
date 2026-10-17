'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type TicketRow = { id: string; name: string; email: string; date: string; status: string; paymentStatus: string; accessToken: string; qrToken: string; usedAt: string | null }
const statuses: Record<string, string> = { VALID: '未入場', USED: '入場済み', CANCELLED: 'キャンセル' }

function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close() }, [])
  return <dialog ref={ref} className="admin-modal" aria-label={label} onCancel={event => { event.preventDefault(); onClose() }}>{children}</dialog>
}

export default function AdminTicketList({ eventId, tickets }: { eventId: string; tickets: TicketRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<TicketRow | null>(null)
  const [confirming, setConfirming] = useState<TicketRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const filtered = tickets.filter(t => (!status || t.status === status) && `${t.name} ${t.email} ${t.id}`.toLowerCase().includes(query.trim().toLowerCase()))
  async function checkIn(ticket: TicketRow) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-LIPS-Check-In': '1' }, body: JSON.stringify({ eventId, qrToken: ticket.qrToken, confirm: true }) })
      const data = await response.json()
      const messages: Record<string, string> = { USED: '入場を記録しました。', ALREADY_USED: 'すでに入場済みです。', CANCELLED: 'キャンセルされたチケットです。', UNPAID: '返金された注文は入場できません。', UNAUTHORIZED: '管理者として再ログインしてください。', WRONG_EVENT: '別のイベントのチケットです。', FORBIDDEN: 'リクエスト元を確認できません。管理画面を開き直してください。', UNSUPPORTED_MEDIA_TYPE: 'リクエスト形式が正しくありません。', SERVER_CONFIGURATION_ERROR: '管理画面のURL設定を確認してください。' }
      setMessage(messages[data.result] ?? '入場処理に失敗しました。再度お試しください。')
      if (data.result === 'USED' || data.result === 'ALREADY_USED') { setConfirming(null); router.refresh() }
    } catch { setMessage('通信に失敗しました。再度お試しください。') }
    finally { setBusy(false) }
  }
  return <>
    <div className="admin-filters"><label>顧客・チケット検索<input value={query} onChange={e => setQuery(e.target.value)} placeholder="名前、メール、チケットID" /></label><label>入場状態<select value={status} onChange={e => setStatus(e.target.value)}><option value="">すべて</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    <p>{filtered.length} / {tickets.length} tickets</p><p role="status">{message}</p>
    <div className="table-wrap"><table><thead><tr><th>名前</th><th>メール</th><th>購入日時 (Vancouver)</th><th>チケット</th><th>状態</th><th>操作</th></tr></thead><tbody>{filtered.map(ticket => <tr key={ticket.id}><td>{ticket.name}</td><td>{ticket.email}</td><td>{ticket.date}</td><td>#{ticket.id.slice(-8).toUpperCase()}</td><td>{statuses[ticket.status]}{ticket.paymentStatus === 'REFUNDED' && ' / 返金済み'}{ticket.usedAt && <small className="admin-used-at">{ticket.usedAt}</small>}</td><td><div className="admin-actions"><button onClick={() => setSelected(ticket)}>QR表示</button><a href={`/ticket/${ticket.accessToken}`} target="_blank" rel="noreferrer">チケット</a><button disabled={busy || ticket.status !== 'VALID' || ticket.paymentStatus !== 'PAID'} onClick={() => { setConfirming(ticket); setMessage('') }}>手動で入場</button></div></td></tr>)}</tbody></table>{!filtered.length && <p>該当するチケットはありません。</p>}</div>
    {selected && <Modal label="チケットQR" onClose={() => setSelected(null)}><button autoFocus onClick={() => setSelected(null)}>閉じる</button><h2>{selected.name}</h2><p>#{selected.id.slice(-8).toUpperCase()} · {statuses[selected.status]}</p><Image unoptimized src={`/api/tickets/qr/${selected.accessToken}`} alt={`${selected.name}の入場QRコード`} width={300} height={300}/><a href={`/api/tickets/qr/${selected.accessToken}`} download>QRをダウンロード</a></Modal>}
    {confirming && <Modal label="入場確認" onClose={() => { if (!busy) setConfirming(null) }}><h2>入場を記録しますか？</h2><p>{confirming.name}<br/>{confirming.email}<br/>#{confirming.id.slice(-8).toUpperCase()}</p><div className="admin-actions"><button autoFocus disabled={busy} onClick={() => setConfirming(null)}>戻る</button><button disabled={busy} onClick={() => checkIn(confirming)}>{busy ? '処理中…' : '入場を確定'}</button></div><p role="status">{message}</p></Modal>}
  </>
}

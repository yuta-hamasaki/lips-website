'use client'

import { ArrowLeft, Download } from 'lucide-react'
import { useState } from 'react'

 type TicketDetails = {
  title: string; label: string; date: string; venue: string; name: string
  email: string; number: string; status: string; qr: string
}

export default function TicketActions({ ticket, fallbackHref = '/' }: { ticket?: TicketDetails; fallbackHref?: string }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveTicket() {
    if (!ticket || saving) return
    setSaving(true)
    setError('')
    try {
      const qr = new Image()
      qr.src = ticket.qr
      await qr.decode()
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable')
      const width = 1000
      const rows: { text: string; y: number; size: number; color: string }[] = []
      let y = 90
      function add(text: string, size: number, color: string) {
        context!.font = `${size}px Arial, sans-serif`
        let line = ''
        for (const char of Array.from(text)) {
          if (char === '\n' || context!.measureText(line + char).width > width - 120) {
            rows.push({ text: line, y, size, color }); y += size * 1.45; line = ''
          }
          if (char !== '\n') line += char
        }
        rows.push({ text: line, y, size, color }); y += size * 1.45 + 18
      }
      add('Lips. / ENTRY TICKET', 34, '#ff8fc7')
      add(ticket.label, 22, '#ff8fc7')
      add(ticket.title, 48, '#ffffff')
      for (const [label, value] of [
        ['DATE · VANCOUVER TIME', ticket.date], ['VENUE', ticket.venue],
        ['GUEST', ticket.name], ['EMAIL', ticket.email],
        ['TICKET', `#${ticket.number} · ${ticket.status}`],
      ]) {
        add(label, 20, '#ff8fc7'); add(value, 30, '#ffffff')
      }
      canvas.width = width
      canvas.height = Math.ceil(y + 620)
      context.fillStyle = '#100910'
      context.fillRect(0, 0, width, canvas.height)
      for (const row of rows) {
        context.font = `${row.size}px Arial, sans-serif`
        context.fillStyle = row.color
        context.fillText(row.text, 60, row.y)
      }
      context.fillStyle = '#ffffff'
      context.fillRect(240, y, 520, 520)
      context.drawImage(qr, 260, y + 20, 480, 480)
      context.font = '24px Arial, sans-serif'
      context.textAlign = 'center'
      context.fillStyle = '#ffffff'
      context.fillText(ticket.status === 'VALID' ? 'Present this QR code at the door.' : `Ticket status: ${ticket.status}`, 500, y + 566)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Export failed')), 'image/png'))
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lips-ticket-${ticket.number}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch {
      setError('Unable to save your ticket. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="ticket-action-group">
    <div className="ticket-actions">
      {ticket && <button className="ticket-button" type="button" disabled={saving} onClick={saveTicket}>
        <Download aria-hidden="true" size={18} />{saving ? 'SAVING…' : 'SAVE TICKET'}
      </button>}
      <a className="outline-button" href={fallbackHref}><ArrowLeft aria-hidden="true" size={18} />BACK TO HOME</a>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>
}

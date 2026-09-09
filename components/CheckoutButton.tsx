'use client'

import { useState } from 'react'

export default function CheckoutButton({ eventSlug, disabled = false }: { eventSlug: string; disabled?: boolean }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function checkout() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventSlug }) })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Checkout is unavailable.')
      window.location.assign(result.url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Checkout is unavailable.'); setLoading(false) }
  }
  return <div><button className="ticket-button" type="button" onClick={checkout} disabled={disabled || loading}>{loading ? 'OPENING CHECKOUT…' : 'BUY TICKET'}</button>{error && <p className="form-error" role="alert">{error}</p>}</div>
}

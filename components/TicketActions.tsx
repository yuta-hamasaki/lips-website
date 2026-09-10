'use client'

import { ArrowLeft, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

type TicketActionsProps = {
  accessToken?: string
  fallbackHref?: string
}

export default function TicketActions({ accessToken, fallbackHref = '/' }: TicketActionsProps) {
  const router = useRouter()

  function goBack() {
    if (window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return (
    <div className="ticket-actions">
      {accessToken && (
        <a className="ticket-button" href={`/api/tickets/qr/${accessToken}`} download="lips-ticket-qr.png">
          <Download aria-hidden="true" size={17} />
          SAVE TICKET
        </a>
      )}
      <button className="outline-button" type="button" onClick={goBack}>
        <ArrowLeft aria-hidden="true" size={17} />
        BACK
      </button>
    </div>
  )
}

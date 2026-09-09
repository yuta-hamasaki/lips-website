'use client'

export default function EventError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="center-page"><section className="notice-card"><p className="micro">EVENTS</p><h1>Unable to load event</h1><p>イベント情報を取得できませんでした。しばらくしてから再度お試しください。</p><button className="ticket-button" type="button" onClick={reset}>TRY AGAIN</button></section></main>
}

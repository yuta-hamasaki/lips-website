'use client'

import Link from 'next/link'

import { usePathname } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'

export default function AdminSessionBar() {
  const pathname = usePathname()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function logout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('Logout failed')
      // A full navigation also clears Next.js's in-memory cache of admin pages.
      window.location.replace('/')
    } catch {
      setError('ログアウトできませんでした。もう一度お試しください。')
      setPending(false)
    }
  }
  useEffect(() => {
    // Recheck authentication when restoring a page from the browser's back/forward cache.
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload() }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])
  if (pathname === '/admin/login') return null
  return <div className="admin-session-bar"><Link className="admin-operations-link" href="/admin/operations">メール送信状況</Link><form action="/api/admin/logout" method="post" onSubmit={logout}><button type="submit" disabled={pending}>{pending ? 'ログアウト中…' : 'ログアウト'}</button>{error && <p role="alert">{error}</p>}</form></div>
}

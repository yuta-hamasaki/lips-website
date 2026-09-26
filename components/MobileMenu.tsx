'use client'

import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  return <div className="mobile-menu" onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); event.currentTarget.querySelector('button')?.focus() }
  }}>
    <button className="menu" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    {open && <nav id="mobile-navigation" aria-label="Mobile navigation">
      {['Home', 'Events', 'Lineup', 'Experience', 'Tickets'].map(item => <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setOpen(false)}>{item}</a>)}
    </nav>}
  </div>
}

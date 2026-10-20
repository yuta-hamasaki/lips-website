import Link from 'next/link'
import { contactEmail } from '@/lib/contact'

export default function SiteFooter() {
  return <footer id="contact"><Link className="brand" href="/">Lips<span>.</span></Link><p>© 2026 LIPS. MUSIC PEOPLE CULTURE.</p><div><a href={`mailto:${contactEmail}`}>CONTACT</a><Link href="/privacy">PRIVACY</Link><Link href="/terms">TICKET TERMS</Link><a href="https://www.instagram.com/lips_event_vancouver/" target="_blank" rel="noopener noreferrer">INSTAGRAM</a></div><span>GOOD MUSIC BETTER PEOPLE ✦</span></footer>
}

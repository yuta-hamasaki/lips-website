import Link from 'next/link'
import type { Metadata } from 'next'
import { privacyPolicyHtml } from '@/lib/content/privacy-policy'
import styles from './privacy.module.css'

export const metadata: Metadata = { title: 'Privacy Policy | LIPS', description: 'Privacy Policy for Lips Entertainment.' }

export default function PrivacyPage() {
  return <main className="policy-page">
    <Link className="brand" href="/">Lips<span>.</span></Link>
    <article className={styles.document} aria-label="Privacy Policy" dangerouslySetInnerHTML={{ __html: privacyPolicyHtml }}/>
    <p><Link href="/terms">Ticket terms</Link> · <Link href="/">Back to home</Link></p>
  </main>
}

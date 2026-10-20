import Link from 'next/link'
import type { Metadata } from 'next'
import { contactEmail } from '@/lib/contact'

export const metadata: Metadata = { title: 'Ticket Terms | LIPS', description: 'Ticket purchase, entry and support information for LIPS events.' }

export default function TermsPage() {
  return <main className="policy-page"><Link className="brand" href="/">Lips<span>.</span></Link><h1>Ticket terms & support</h1>
    <h2>Before you purchase</h2><p>Check the event date, venue, entry requirements and any event-specific conditions before paying. Stripe Checkout shows the final price and currency. Each checkout purchases one admission ticket. Keep your ticket email and QR code available for entry.</p>
    <h2>Entry</h2><p>One valid ticket permits one check-in for its event. Previously used, cancelled or fully refunded tickets cannot be used again. Do not post your QR code publicly. Any age or identification requirements must be checked with the organiser before purchase.</p>
    <h2>Refunds, cancellations and changes</h2>{process.env.NEXT_PUBLIC_REFUND_POLICY && <p>{process.env.NEXT_PUBLIC_REFUND_POLICY}</p>}<p>Refund eligibility and event-specific cancellation conditions must be confirmed with the organiser before purchase. For a refund request, event change or cancellation enquiry, email us with your order reference. This page does not promise an automatic refund or exclude any applicable consumer rights.</p>
    <h2>Missing ticket or payment problem</h2><p>Check your spam folder and the payment success page. If your ticket has not arrived, contact us with your purchase email and order reference. Never email your full card details or password.</p>
    <h2>Contact</h2><p><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
    <p><Link href="/privacy">Privacy</Link> · <Link href="/">Back to home</Link></p>
  </main>
}

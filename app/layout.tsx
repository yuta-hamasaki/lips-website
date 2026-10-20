import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) } : {}),
  openGraph: { title: 'LIPS — Music People Culture', description: 'An immersive R&B and hip-hop night in Vancouver.', type: 'website' },
  twitter: { card: 'summary_large_image' },
  title: 'Lips — Same Beat. Different Reality.',
  description: 'An immersive R&B and hip-hop night in Vancouver.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}

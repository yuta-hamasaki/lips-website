import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lips — Same Beat. Different Reality.',
  description: 'An immersive R&B and hip-hop night in Vancouver.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}

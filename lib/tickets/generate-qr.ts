import 'server-only'
import QRCode from 'qrcode'
import { appUrl } from '@/lib/env'

export function checkInUrl(qrToken: string): string {
  return `${appUrl()}/admin/check-in?token=${encodeURIComponent(qrToken)}`
}

export function generateQrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(checkInUrl(qrToken), { width: 480, margin: 2, color: { dark: '#050305', light: '#ffffff' } })
}

export function generateQrBuffer(qrToken: string): Promise<Buffer> {
  return QRCode.toBuffer(checkInUrl(qrToken), {
    type: 'png',
    width: 480,
    margin: 2,
    color: { dark: '#050305', light: '#ffffff' },
  })
}

import 'server-only'
import { Resend } from 'resend'

let client: Resend | undefined

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not configured')
  return client ??= new Resend(key)
}

import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

export function isAdminRequest(request: NextRequest): boolean {
  const configured = process.env.ADMIN_API_KEY
  const authorization = request.headers.get('authorization')
  if (!configured || !authorization?.startsWith('Basic ')) return false
  try {
    const [, password = ''] = Buffer.from(authorization.slice(6), 'base64').toString('utf8').split(':', 2)
    const actual = Buffer.from(password)
    const expected = Buffer.from(configured)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch { return false }
}

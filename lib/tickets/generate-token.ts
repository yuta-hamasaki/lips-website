import { randomBytes } from 'node:crypto'

export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url')
}

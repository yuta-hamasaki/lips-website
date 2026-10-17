import 'server-only'
import { appUrl } from '@/lib/env'

export function checkInRequestFailure(request: Request): { result: string; status: number } | null {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') return { result: 'UNSUPPORTED_MEDIA_TYPE', status: 415 }

  // Configured canonical origin, never Host or forwarded request headers.
  let allowedOrigin: string
  try {
    const configured = new URL(appUrl())
    if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password) throw new Error('Invalid origin')
    allowedOrigin = configured.origin
  } catch { return { result: 'SERVER_CONFIGURATION_ERROR', status: 503 } }
  const origin = request.headers.get('origin')
  if (origin !== allowedOrigin) return { result: 'FORBIDDEN', status: 403 }
  // This is a non-secret request-intent marker. Foreign origins cannot add it
  // in a simple browser request; this API does not grant cross-origin CORS.
  if (request.headers.get('x-lips-check-in') !== '1') return { result: 'FORBIDDEN', status: 403 }
  return null
}

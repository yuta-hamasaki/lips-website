import type { NextRequest } from 'next/server'
import { authenticateAdmin } from '@/lib/admin-credentials'

export function isAdminRequest(request: NextRequest): Promise<boolean> {
  return authenticateAdmin(request.headers.get('authorization'))
}

import 'server-only'
import { prisma } from '@/lib/prisma'

// Fixed keys keep storage bounded even when attackers submit random usernames.
// DB-level atomic counters apply across workers and deployments using this DB.
export async function allowAdminLogin(username: string, now = new Date()): Promise<boolean> {
  const known = [process.env.ADMIN_1_USERNAME, process.env.ADMIN_2_USERNAME, process.env.ADMIN_USERNAME || 'admin']
  const encoded = new TextEncoder().encode(known.includes(username) ? username : 'unknown')
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  const key = 'account:' + Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  const resetAt = new Date(now.getTime() + 15 * 60 * 1000)
  const increment = async (bucket: string) => {
    const rows = await prisma.$queryRaw<Array<{ attempts: number }>>`
      INSERT INTO "AdminLoginRateLimit" ("key", "attempts", "resetAt") VALUES (${bucket}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AdminLoginRateLimit"."resetAt" <= ${now} THEN 1 ELSE "AdminLoginRateLimit"."attempts" + 1 END,
        "resetAt" = CASE WHEN "AdminLoginRateLimit"."resetAt" <= ${now} THEN ${resetAt} ELSE "AdminLoginRateLimit"."resetAt" END
      RETURNING "attempts"
    `
    return rows[0].attempts
  }
  if (await increment('global') > 200) return false
  return await increment(key) <= 10
}

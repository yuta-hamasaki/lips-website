import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())
const issues = []
const requireValue = key => { if (!process.env[key]?.trim()) issues.push(`${key}: missing`) }
for (const key of ['DATABASE_URL', 'DIRECT_URL', 'MICROCMS_SERVICE_DOMAIN', 'MICROCMS_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'NEXT_PUBLIC_APP_URL', 'ADMIN_1_USERNAME', 'ADMIN_1_PASSWORD', 'ADMIN_2_USERNAME', 'ADMIN_2_PASSWORD', 'ADMIN_SESSION_SECRET', 'NEXT_PUBLIC_REFUND_POLICY']) requireValue(key)
for (const key of ['ADMIN_1_PASSWORD', 'ADMIN_2_PASSWORD']) if ((process.env[key]?.length ?? 0) < 16) issues.push(`${key}: use at least 16 characters; 32 random characters recommended`)
if ((process.env.ADMIN_SESSION_SECRET?.length ?? 0) < 32) issues.push('ADMIN_SESSION_SECRET: use at least 32 random characters')
if (process.env.ADMIN_1_USERNAME === process.env.ADMIN_2_USERNAME) issues.push('Administrator usernames must be distinct')
if (process.env.ADMIN_1_PASSWORD && process.env.ADMIN_1_PASSWORD === process.env.ADMIN_2_PASSWORD) issues.push('Administrator passwords must be distinct')
for (const key of ['ADMIN_1_USERNAME', 'ADMIN_2_USERNAME']) if (!/^[a-zA-Z0-9._-]{1,64}$/.test(process.env[key] || '')) issues.push(`${key}: invalid username`)
try {
  const url = new URL(process.env.NEXT_PUBLIC_APP_URL)
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.invalid') || /(^|\.)example\.(com|org|net)$/.test(url.hostname) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw Error()
} catch { issues.push('NEXT_PUBLIC_APP_URL: set the real public HTTPS origin') }
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')) issues.push('STRIPE_SECRET_KEY: live mode is required')
if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) issues.push('STRIPE_WEBHOOK_SECRET: invalid format')
if (!process.env.RESEND_API_KEY?.startsWith('re_')) issues.push('RESEND_API_KEY: invalid format')
if (/@(?:resend\.dev|example\.com)>?$/.test(process.env.RESEND_FROM_EMAIL || '')) issues.push('RESEND_FROM_EMAIL: use a verified sender domain')
if (issues.length) { console.error('Production configuration needs attention (values are not shown):\n' + issues.map(issue => `- ${issue}`).join('\n')); process.exitCode = 1 }
else console.info('Production configuration format checks passed. Provider verification, DB migrations and end-to-end tests are still required.')

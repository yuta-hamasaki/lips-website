import nextEnv from '@next/env'
import { mkdirSync, chmodSync, unlinkSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
nextEnv.loadEnvConfig(process.cwd())
const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL || '')
if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw Error('Configure a Postgres connection')
process.umask(0o077)
const directory = resolve('.local/backups')
mkdirSync(directory, { recursive: true, mode: 0o700 }); chmodSync(directory, 0o700)
const output = resolve(directory, `lips-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`)
// Credentials are passed through libpq environment variables, never CLI arguments or logs.
const env = { PATH: process.env.PATH, PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.searchParams.get('sslmode') || 'require' }
const child = spawn('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', output], { env, stdio: 'ignore' })
const failed = () => { if (existsSync(output)) unlinkSync(output); console.error('Backup failed. Check pg_dump availability, permissions and database connectivity. No credentials were printed.'); process.exitCode = 1 }
child.on('error', failed)
child.on('exit', code => { if (code !== 0) failed(); else { chmodSync(output, 0o600); console.info('Backup saved under .local/backups. Store an encrypted off-site copy and test restoration on an isolated database.') } })

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename)
  if (!existsSync(path)) return

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (!match || process.env[match[1]] !== undefined) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[match[1]] = value
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const rawDomain = process.env.MICROCMS_SERVICE_DOMAIN?.trim()
const apiKey = process.env.MICROCMS_API_KEY?.trim()
const endpoint = process.env.MICROCMS_EVENTS_ENDPOINT?.trim() || 'events'

if (!rawDomain || !apiKey) {
  console.error('接続テストを実行できません: MICROCMS_SERVICE_DOMAIN と MICROCMS_API_KEY を .env.local に設定してください。')
  process.exit(1)
}

const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\.microcms\.io\/?$/, '')
const url = new URL(`https://${domain}.microcms.io/api/v1/${endpoint}`)
url.searchParams.set('limit', '1')
url.searchParams.set('fields', 'id')

try {
  const response = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': apiKey } })
  if (!response.ok) {
    const hints = {
      401: 'APIキーが正しいか確認してください。',
      403: 'APIキーにGET権限があるか確認してください。',
      404: `API ID「${endpoint}」が存在するか確認してください。`,
    }
    console.error(`microCMSへの接続に失敗しました (HTTP ${response.status})`)
    console.error(hints[response.status] ?? 'サービスドメイン、API ID、microCMSの状態を確認してください。')
    process.exit(1)
  }

  const data = await response.json()
  if (!Array.isArray(data.contents) || typeof data.totalCount !== 'number') {
    console.error('microCMSには接続できましたが、リストAPIとして認識できないレスポンスでした。')
    process.exit(1)
  }
  console.log(`microCMSへの接続に成功しました: ${endpoint} (${data.totalCount}件)`)
} catch (error) {
  console.error('microCMSへの接続に失敗しました:', error instanceof Error ? error.message : error)
  process.exit(1)
}

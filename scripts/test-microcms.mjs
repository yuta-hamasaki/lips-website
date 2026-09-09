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
url.searchParams.set('limit', '100')

function stringField(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
}

function homepageExclusion(record, now = new Date()) {
  const title = stringField(record, 'title', 'eventTitle')
  const slug = stringField(record, 'slug')
  const date = stringField(record, 'date', 'eventDate')
  const venue = stringField(record, 'venue')
  const missing = [!title && 'title/eventTitle', !slug && 'slug', !date && 'date/eventDate', !venue && 'venue'].filter(Boolean)
  if (missing.length) return `必須フィールド不足: ${missing.join(', ')}`

  const status = stringField(record, 'status', 'eventStatus')?.toLowerCase()
  if (status === 'draft' || status === 'sold-out' || status === 'cancelled') return `status=${status}`

  const startsAt = stringField(record, 'startTime') ? `${date.slice(0, 10)}T${stringField(record, 'startTime')}` : date
  const timestamp = Date.parse(startsAt)
  if (Number.isNaN(timestamp)) return `開催日時を解釈できません: ${startsAt}`
  if (timestamp < now.getTime()) return `開催日時が過去です: ${startsAt}`
  return null
}

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
  const diagnostics = data.contents.map((record) => ({ id: stringField(record, 'id') ?? 'unknown', reason: homepageExclusion(record) }))
  const visible = diagnostics.filter(({ reason }) => reason === null)
  const excluded = diagnostics.filter(({ reason }) => reason !== null)

  console.log(`microCMSへの接続に成功しました: ${endpoint} (${data.totalCount}件)`)
  console.log(`フロントページ表示対象: ${visible.length}件 / 確認した${data.contents.length}件`)
  for (const { id, reason } of excluded) console.warn(`- ${id}: 非表示 (${reason})`)
  if (data.totalCount > data.contents.length) console.warn(`先頭${data.contents.length}件のみ診断しました。`)
  if (!visible.length) {
    console.error('接続には成功していますが、フロントページに表示できるイベントがありません。')
    process.exit(1)
  }
} catch (error) {
  console.error('microCMSへの接続に失敗しました:', error instanceof Error ? error.message : error)
  process.exit(1)
}

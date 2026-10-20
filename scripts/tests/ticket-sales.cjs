const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const api = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/ticket-sales.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: api })
const now = Date.parse('2026-10-20T20:00:00Z')
const event = { date: '2026-10-21T06:00:00Z', status: 'published', stripePriceId: 'price_example' }
test('sales close at the earlier of event start or sales end, including without an explicit end', () => {
  assert.equal(api.ticketSalesOpen(event, now), true)
  assert.equal(api.ticketSalesOpen(event, Date.parse(event.date)), false)
  assert.equal(api.ticketSalesOpen({ ...event, date: '2026-10-19T06:00:00Z' }, now), false)
  assert.equal(api.ticketSalesOpen({ ...event, ticketSalesEnd: '2026-10-20T20:00:00Z' }, now), false)
  assert.equal(api.ticketSalesOpen({ ...event, ticketSalesStart: '2026-10-20T21:00:00Z' }, now), false)
  assert.equal(api.ticketSalesOpen({ ...event, ticketSalesEnd: 'invalid' }, now), false)
  for (const status of ['draft', 'sold-out', 'cancelled']) assert.equal(api.ticketSalesOpen({ ...event, status }, now), false)
})

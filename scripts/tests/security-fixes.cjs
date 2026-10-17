const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Provider/database imports are deny-by-default mocks; no real clients or env.
function load(file, mocks) {
  const filename = path.join(__dirname, '../..', file)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, URL, Buffer, process: { env: { STRIPE_WEBHOOK_SECRET: 'dummy-webhook-secret' } },
    console: { info() {}, warn() {}, error() {} },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
  }, { filename, timeout: 1000 })
  return exports
}
const next = { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } }
class KnownError extends Error { constructor(code) { super(code); this.code = code } }
const Prisma = { PrismaClientKnownRequestError: KnownError, TransactionIsolationLevel: { Serializable: 'Serializable' } }

function paymentHarness() {
  const customer = { id: 'customer-1', email: 'guest@example.invalid', name: 'Original customer' }
  const state = { orders: [], tickets: [], refunds: new Map(), writes: 0 }
  const tx = {
    customer: { upsert: async ({ update }) => { Object.assign(customer, update); return customer } },
    refundedPayment: {
      findUnique: async ({ where }) => state.refunds.get(where.paymentIntentId) ?? null,
      create: async ({ data }) => { state.refunds.set(data.paymentIntentId, data); state.writes++; return data },
    },
    order: {
      create: async ({ data }) => {
        const ticket = { id: `ticket-${state.tickets.length}`, ...data.tickets.create }
        const order = { id: `order-${state.orders.length}`, ...data, tickets: [ticket] }
        ticket.order = order
        state.tickets.push(ticket); state.orders.push(order)
        return order
      },
      updateMany: async ({ where, data }) => {
        for (const order of state.orders) if (order.stripePaymentIntentId === where.stripePaymentIntentId && order.paymentStatus === where.paymentStatus) {
          Object.assign(order, data); state.writes++
        }
      },
    },
    ticket: { updateMany: async ({ where, data }) => {
      for (const ticket of state.tickets) if (ticket.order.stripePaymentIntentId === where.order.stripePaymentIntentId && ticket.status !== where.status.not) {
        Object.assign(ticket, data); state.writes++
      }
    } },
  }
  const cms = { id: 'cms-1', slug: 'event', stripePriceId: 'price-1' }
  const common = { 'server-only': {}, '@/lib/serializable-transaction': { serializableTransaction: async work => work(tx) } }
  const issue = load('lib/tickets/create-ticket.ts', {
    ...common, '@prisma/client': { Prisma },
    '@/lib/prisma': { prisma: {
      order: { findUnique: async ({ where }) => state.orders.find(o => o.stripeSessionId === where.stripeSessionId) ?? null },
      event: { findUnique: async () => ({ id: 'event-1', microCmsId: 'cms-1', slug: 'event' }) },
    } },
    '@/lib/events/get-event': { getEventById: async () => cms, getEventBySlug: async () => cms },
    './generate-token': { generateSecureToken: () => 'dummy-token' },
  })
  const refund = load('lib/tickets/refund-ticket.ts', common)
  function session(id, name, intent = `pi-${id}`) {
    return { id, payment_status: 'paid', amount_total: 1000, currency: 'cad', payment_intent: intent,
      metadata: { eventId: 'event-1', microCmsEventId: 'cms-1', eventSlug: 'event' },
      line_items: { data: [{ price: { id: 'price-1' } }] },
      customer_details: { email: customer.email, name: 'Billing name' },
      custom_fields: [{ key: 'ticket_holder_name', text: { value: name } }],
    }
  }
  const charge = (intent, amount = 1000) => ({ payment_intent: intent, amount: 1000, amount_refunded: amount, refunded: amount === 1000 })
  return { ...issue, ...refund, state, customer, session, charge }
}

test('same-email purchases keep separate holder names and never rename the customer', async () => {
  const h = paymentHarness()
  const first = await h.issueTicketForSession(h.session('one', 'First Guest'))
  const second = await h.issueTicketForSession(h.session('two', 'Second Guest'))
  assert.equal(h.customer.name, 'Original customer')
  assert.equal(first.tickets[0].holderName, 'First Guest')
  assert.equal(second.tickets[0].holderName, 'Second Guest')
  const replay = await h.issueTicketForSession(h.session('one', 'Changed on replay'))
  assert.equal(replay.tickets[0].holderName, 'First Guest')
  assert.equal(h.state.orders.length, 2)
})

test('full refund revokes only the associated order and duplicate delivery makes no new writes', async () => {
  const h = paymentHarness()
  const first = await h.issueTicketForSession(h.session('one', 'First Guest'))
  const second = await h.issueTicketForSession(h.session('two', 'Second Guest'))
  first.tickets[0].status = 'USED'; first.tickets[0].usedAt = 'original-time'
  await h.revokeFullyRefundedPayment(h.charge('pi-one'), 'evt-refund')
  assert.equal(first.paymentStatus, 'REFUNDED')
  assert.equal(first.tickets[0].status, 'CANCELLED')
  assert.equal(first.tickets[0].usedAt, 'original-time')
  assert.equal(second.paymentStatus, 'PAID')
  assert.equal(second.tickets[0].status, 'VALID')
  const writes = h.state.writes
  await h.revokeFullyRefundedPayment(h.charge('pi-one'), 'evt-refund')
  await h.revokeFullyRefundedPayment(h.charge('pi-one'), 'evt-another-refund')
  assert.equal(h.state.writes, writes)
})

test('refund before issuance cannot produce a valid ticket', async () => {
  const h = paymentHarness()
  await h.revokeFullyRefundedPayment(h.charge('pi-one'), 'evt-early')
  const order = await h.issueTicketForSession(h.session('one', 'Guest'))
  assert.equal(order.paymentStatus, 'REFUNDED')
  assert.equal(order.tickets[0].status, 'CANCELLED')
})

test('partial refunds leave admission unchanged until the cumulative refund is full', async () => {
  const h = paymentHarness()
  const order = await h.issueTicketForSession(h.session('one', 'Guest'))
  await h.revokeFullyRefundedPayment(h.charge('pi-one', 400), 'evt-partial')
  assert.equal(order.paymentStatus, 'PAID')
  assert.equal(order.tickets[0].status, 'VALID')
  assert.equal(h.state.refunds.size, 0)
  await h.revokeFullyRefundedPayment(h.charge('pi-one', 1000), 'evt-full')
  assert.equal(order.paymentStatus, 'REFUNDED')
})

test('serializable transaction retries only bounded write conflicts', async () => {
  let calls = 0
  const { serializableTransaction } = load('lib/serializable-transaction.ts', {
    'server-only': {}, '@prisma/client': { Prisma },
    '@/lib/prisma': { prisma: { $transaction: async (work, options) => {
      assert.equal(options.isolationLevel, 'Serializable')
      calls++
      if (calls < 3) throw new KnownError('P2034')
      return work({})
    } } },
  })
  assert.equal(await serializableTransaction(async () => 'committed'), 'committed')
  assert.equal(calls, 3)
  calls = 0
  await assert.rejects(serializableTransaction(async () => { throw new KnownError('P2034') }), /P2034/)
  assert.equal(calls, 4)
  calls = 0
  await assert.rejects(serializableTransaction(async () => { throw new KnownError('P2002') }), /P2002/)
  // The initial two injected P2034 conflicts are retried, then P2002 is not.
  assert.equal(calls, 3)
})

function request(overrides = {}, body = {}) {
  const headers = { 'content-type': 'application/json; charset=utf-8', origin: 'https://tickets.example.invalid', 'x-lips-check-in': '1', ...overrides }
  let parses = 0
  return { headers: { get: key => headers[key.toLowerCase()] ?? null }, json: async () => { parses++; return body }, parses: () => parses }
}
function guard(url = 'https://tickets.example.invalid') {
  return load('lib/check-in-request.ts', { 'server-only': {}, '@/lib/env': { appUrl: () => url } }).checkInRequestFailure
}

test('check-in request guard accepts configured origin and rejects unsafe request shapes', () => {
  const check = guard()
  assert.equal(check(request()), null)
  for (const headers of [{ 'content-type': 'text/plain' }, { 'content-type': null }]) assert.equal(check(request(headers)).status, 415)
  for (const headers of [{ origin: null }, { origin: 'null' }, { origin: 'https://foreign.example.invalid' }, { origin: 'https://tickets.example.invalid.foreign.invalid' }, { origin: 'http://tickets.example.invalid' }, { 'x-lips-check-in': null }, { 'x-lips-check-in': 'other' }]) assert.equal(check(request(headers)).status, 403)
  assert.equal(guard('invalid')(request()).status, 503)
})

function checkInHarness({ paid = true, status = 'VALID', authenticated = true } = {}) {
  let updates = 0
  const ticket = { id: 'ticket-1', eventId: 'event-1', status, holderName: 'Ticket Guest', event: { id: 'event-1', title: 'Event' }, order: { paymentStatus: paid ? 'PAID' : 'REFUNDED', customer: { name: 'Shared Customer' } } }
  const { POST } = load('app/api/check-in/route.ts', {
    'next/server': next, '@/lib/admin-auth': { isAdminRequest: () => authenticated },
    '@/lib/check-in-request': { checkInRequestFailure: guard() },
    '@/lib/prisma': { prisma: { ticket: {
      findUnique: async () => ticket,
      updateMany: async ({ where, data }) => { assert.equal(where.order.paymentStatus, 'PAID'); updates++; Object.assign(ticket, data); return { count: 1 } },
      findUniqueOrThrow: async () => ticket,
    } } },
  })
  return { POST, updates: () => updates }
}
const input = { eventId: 'event-1', qrToken: 'dummy-qr', confirm: true }

test('valid scanner validation returns immutable holder name and manual confirmation still works', async () => {
  const h = checkInHarness()
  const preview = await h.POST(request({}, { ...input, confirm: false }))
  assert.equal(preview.body.ticket.customerName, 'Ticket Guest')
  assert.equal(h.updates(), 0)
  assert.equal((await h.POST(request({}, input))).body.result, 'USED')
  assert.equal(h.updates(), 1)
})

test('check-in denies refunded/cancelled/unauthenticated/foreign requests before mutation', async () => {
  for (const [options, expected] of [[{ paid: false }, 'UNPAID'], [{ status: 'CANCELLED' }, 'CANCELLED'], [{ authenticated: false }, 'UNAUTHORIZED']]) {
    const h = checkInHarness(options)
    assert.equal((await h.POST(request({}, input))).body.result, expected)
    assert.equal(h.updates(), 0)
  }
  for (const [headers, status] of [[{ 'content-type': 'text/plain' }, 415], [{ origin: 'https://foreign.invalid' }, 403], [{ 'x-lips-check-in': null }, 403]]) {
    const h = checkInHarness()
    const req = request(headers, input)
    assert.equal((await h.POST(req)).status, status)
    assert.equal(req.parses(), 0)
    assert.equal(h.updates(), 0)
  }
})

test('refund webhook cannot bypass signature verification and returns retryable errors', async () => {
  for (const [badSignature, failRefund] of [[true, false], [false, false], [false, true]]) {
    let refunds = 0
    const { POST } = load('app/api/stripe/webhook/route.ts', {
      'next/server': next,
      '@/lib/stripe': { getStripe: () => ({ webhooks: { constructEvent: () => {
        if (badSignature) throw new Error('invalid signature')
        return { id: 'evt-refund', type: 'charge.refunded', data: { object: { id: 'ch-dummy' } } }
      } } }) },
      '@/lib/tickets/create-ticket': { issueTicketForSession: async () => assert.fail('refund must not issue') },
      '@/lib/tickets/send-ticket-email': { sendTicketEmailOnce: async () => assert.fail('refund must not email') },
      '@/lib/tickets/refund-ticket': { revokeFullyRefundedPayment: async () => { refunds++; if (failRefund) throw new Error('transient') } },
    })
    const response = await POST({ headers: { get: () => 'dummy-signature' }, text: async () => '{}' })
    assert.equal(response.status, badSignature ? 400 : failRefund ? 500 : 200)
    assert.equal(refunds, badSignature ? 0 : 1)
  }
})

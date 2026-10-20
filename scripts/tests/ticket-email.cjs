const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const path = require('node:path')

function load(file, mocks) {
  const filename = path.join(__dirname, '../..', file)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(code, {
    exports, process, Buffer, console: { info() {}, warn() {}, error() {} },
    require(name) {
      if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
      return mocks[name]
    },
  }, { filename })
  return exports
}

function emailHarness({ preparationFails = false, sendFails = false, paid = true, cancelled = false, initialStatus = 'PENDING', claimedMinutesAgo = 0 } = {}) {
  let status = initialStatus
  let claimTime = new Date(Date.now() - claimedMinutesAgo * 60 * 1000)
  let idempotencyKey
  let sends = 0
  let renderedName
  const order = {
    id: 'order-1', paymentStatus: paid ? 'PAID' : 'REFUNDED', customer: { email: 'buyer@example.com', name: 'Buyer' },
    event: { title: 'Event' }, tickets: [{ id: 'ticket-1', holderName: 'Ticket Guest', status: cancelled ? 'CANCELLED' : 'VALID', accessToken: 'access', qrToken: 'qr' }],
  }
  const api = load('lib/tickets/send-ticket-email.ts', {
    'server-only': {},
    '@/emails/ticket-email': { ticketEmailHtml: props => { renderedName = props.customerName; return '<p>Ticket</p>' } },
    '@/lib/env': { appUrl: () => { if (preparationFails) throw new Error('Missing URL'); return 'https://example.com' } },
    '@/lib/prisma': { prisma: { order: {
      updateMany: async ({where, data}) => {
        if (data.ticketEmailStatus !== 'SENDING') {
          if (status !== 'SENDING' || claimTime !== where.ticketEmailClaimedAt) return { count: 0 }
          status = data.ticketEmailStatus; return {count: 1}
        }
        const expired = status === 'SENDING' && claimTime < where.OR[1].ticketEmailClaimedAt.lt
        if (!paid || (!['PENDING', 'FAILED'].includes(status) && !expired)) return { count: 0 }
        status = 'SENDING'; claimTime = data.ticketEmailClaimedAt; return { count: 1 }
      },
      findUnique: async () => order,
      update: async ({ data }) => { status = data.ticketEmailStatus },
    } } },
    '@/lib/resend': { getResend: () => ({ emails: { send: async (_message, options) => {
      idempotencyKey = options?.idempotencyKey
      sends++
      return sendFails ? { error: { message: 'Rejected' } } : { data: { id: 'email-1' } }
    } } }) },
    '@/lib/tickets/generate-qr': { generateQrBuffer: async () => Buffer.from('qr') },
  })
  return { ...api, key: () => idempotencyKey, status: () => status, sends: () => sends, renderedName: () => renderedName }
}

test('concurrent delivery and repeat calls send the ticket once', async () => {
  const h = emailHarness()
  await Promise.all([h.sendTicketEmailOnce('order-1'), h.sendTicketEmailOnce('order-1')])
  await h.sendTicketEmailOnce('order-1')
  assert.equal(h.status(), 'SENT')
  assert.equal(h.sends(), 1)
})

test('preparation failure releases the claim for retry', async () => {
  const h = emailHarness({ preparationFails: true })
  await assert.rejects(h.sendTicketEmailOnce('order-1'), /Missing URL/)
  assert.equal(h.status(), 'FAILED')
})

test('Resend rejection remains retryable', async () => {
  const h = emailHarness({ sendFails: true })
  await assert.rejects(h.sendTicketEmailOnce('order-1'), /Rejected/)
  await assert.rejects(h.sendTicketEmailOnce('order-1'), /Rejected/)
  assert.equal(h.status(), 'FAILED')
  assert.equal(h.sends(), 2)
})

test('webhook returns 500 on email failure so Stripe can retry', async () => {
  const previous = process.env.STRIPE_WEBHOOK_SECRET
  process.env.STRIPE_WEBHOOK_SECRET = 'test-secret'
  try {
    const { POST } = load('app/api/stripe/webhook/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => ({ status: options?.status ?? 200, body }) } },
      '@/lib/stripe': { getStripe: () => ({
        webhooks: { constructEvent: () => ({ id: 'evt-1', type: 'checkout.session.completed', data: { object: { id: 'session-1' } } }) },
        checkout: { sessions: { retrieve: async () => ({ id: 'session-1' }) } },
      }) },
      '@/lib/tickets/refund-ticket': { revokeFullyRefundedPayment: async () => {} },
      '@/lib/tickets/create-ticket': { issueTicketForSession: async () => ({ id: 'order-1', tickets: [] }) },
      '@/lib/tickets/send-ticket-email': { sendTicketEmailOnce: async () => { throw new Error('Rejected') } },
    })
    const response = await POST({ headers: { get: () => 'signature' }, text: async () => '{}' })
    assert.equal(response.status, 500)
  } finally {
    if (previous === undefined) delete process.env.STRIPE_WEBHOOK_SECRET
    else process.env.STRIPE_WEBHOOK_SECRET = previous
  }
})


test('email renders the ticket holder snapshot, not the shared customer name', async () => {
  const h = emailHarness()
  await h.sendTicketEmailOnce('order-1')
  assert.equal(h.renderedName(), 'Ticket Guest')
})

test('refunded orders and cancelled tickets never send a ready email', async () => {
  for (const options of [{ paid: false }, { cancelled: true }]) {
    const h = emailHarness(options)
    await h.sendTicketEmailOnce('order-1')
    assert.equal(h.sends(), 0)
  }
})


test('stale SENDING emails can recover, active sends remain locked, and retries use a stable provider key', async () => {
  const stale = emailHarness({ initialStatus: 'SENDING', claimedMinutesAgo: 11 })
  await stale.sendTicketEmailOnce('order-1')
  assert.equal(stale.status(), 'SENT')
  assert.equal(stale.sends(), 1)
  assert.equal(stale.key(), 'ticket-email/order-1')
  const active = emailHarness({ initialStatus: 'SENDING', claimedMinutesAgo: 1 })
  await active.sendTicketEmailOnce('order-1')
  assert.equal(active.sends(), 0)
  assert.equal(active.status(), 'SENDING')
})

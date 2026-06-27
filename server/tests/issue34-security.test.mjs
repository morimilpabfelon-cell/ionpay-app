import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createIonPayServer } from '../app.mjs'

async function startApi({ dbPath = ':memory:', demoMode = true, now } = {}) {
  const app = createIonPayServer({ dbPath, demoMode, now })
  const address = await app.listen(0)
  const baseUrl = `http://127.0.0.1:${address.port}`

  async function request(path, { method = 'GET', token, body, idempotencyKey } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: response.status, data: await response.json() }
  }

  return { app, request }
}

test('Issue #34: API client rejects 2xx body.error and keeps receipt proof gated', () => {
  const apiSource = readFileSync(new URL('../../src/lib/api.ts', import.meta.url), 'utf8')

  assert.match(apiSource, /if \(body\.error\) \{/)
  assert.match(apiSource, /throw new IonPayApiError\(\s*response\.status,/)
  assert.match(apiSource, /function receiptUnavailableReason\(item: ActivityItem\)/)
  assert.match(apiSource, /item\.status !== 'COMPLETED'/)
  assert.match(apiSource, /proofSource: 'api' as const/)
  assert.match(apiSource, /receiptAvailable: !unavailableReason/)
})

test('Issue #34: demoMode false blocks demo verify and fund with no side effects', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-issue34-demo-disabled-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath, demoMode: false })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Demo Disabled', phone: '+51978000001', alias: 'demo.disabled', password: 'ClaveSegura123' },
  })
  assert.equal(user.status, 201)

  const verify = await request('/api/demo/verify', { method: 'POST', token: user.data.token })
  assert.equal(verify.status, 404)
  assert.equal(verify.data.error.code, 'NOT_FOUND')

  const fundingKey = 'issue34-demo-disabled-fund-001'
  const funding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: fundingKey, body: { amount: '10.00' },
  })
  assert.equal(funding.status, 404)
  assert.equal(funding.data.error.code, 'NOT_FOUND')

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  const storedUser = auditDb.prepare('SELECT kyc_status FROM users WHERE id = ?').get(user.data.user.id)
  const fundingTransactions = auditDb.prepare("SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'DEMO_FUNDING'").get().count
  const fundingRecords = auditDb.prepare('SELECT COUNT(*) AS count FROM idempotency_records WHERE idempotency_key = ?').get(fundingKey).count
  auditDb.close()

  assert.equal(storedUser.kyc_status, 'PENDING')
  assert.equal(fundingTransactions, 0)
  assert.equal(fundingRecords, 0)
})

test('Issue #34: auth and function-level guards reject protected money endpoints', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-issue34-auth-matrix-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const protectedRequests = [
    () => request('/api/wallet'),
    () => request('/api/activity'),
    () => request('/api/payment-requests', {
      method: 'POST',
      idempotencyKey: 'issue34-auth-create-001',
      body: { payerAlias: 'nobody', currency: 'PEN', amount: '1.00' },
    }),
    () => request('/api/payment-requests/missing-request/pay', {
      method: 'POST',
      idempotencyKey: 'issue34-auth-pay-001',
      body: {},
    }),
    () => request('/api/payment-requests/missing-request/cancel', { method: 'POST', body: {} }),
    () => request('/api/transfers', {
      method: 'POST',
      idempotencyKey: 'issue34-auth-transfer-001',
      body: { recipientAlias: 'nobody', amount: '1.00' },
    }),
    () => request('/api/conversions', { method: 'POST', body: { fromCurrency: 'PEN', amount: '1.00' } }),
    () => request('/api/demo/verify', { method: 'POST' }),
    () => request('/api/demo/fund', {
      method: 'POST',
      idempotencyKey: 'issue34-auth-demo-fund-001',
      body: { amount: '1.00' },
    }),
  ]

  for (const makeRequest of protectedRequests) {
    const result = await makeRequest()
    assert.equal(result.status, 401)
    assert.equal(result.data.error.code, 'UNAUTHORIZED')
  }

  const invalidSession = await request('/api/payment-requests/missing-request/pay', {
    method: 'POST',
    token: 'token-invalido',
    idempotencyKey: 'issue34-auth-invalid-session-001',
    body: {},
  })
  assert.equal(invalidSession.status, 401)
  assert.equal(invalidSession.data.error.code, 'INVALID_SESSION')

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(auditDb.prepare('SELECT COUNT(*) AS count FROM idempotency_records').get().count, 0)
  assert.equal(auditDb.prepare('SELECT COUNT(*) AS count FROM ledger_transactions').get().count, 0)
  assert.equal(auditDb.prepare('SELECT COUNT(*) AS count FROM payment_requests').get().count, 0)
  auditDb.close()
})

test('Issue #34: payment_request_id authorization failures have no financial side effects', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-issue34-object-auth-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const requester = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Object Requester', phone: '+51978100001', alias: 'object.requester', password: 'ClaveSegura123' },
  })
  const payer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Object Payer', phone: '+51978100002', alias: 'object.payer', password: 'ClaveSegura123' },
  })
  const outsider = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Object Outsider', phone: '+51978100003', alias: 'object.outsider', password: 'ClaveSegura123' },
  })

  for (const user of [requester, payer, outsider]) {
    const verify = await request('/api/demo/verify', { method: 'POST', token: user.data.token })
    assert.equal(verify.status, 200)
  }

  const paymentRequest = await request('/api/payment-requests', {
    method: 'POST',
    token: requester.data.token,
    idempotencyKey: 'issue34-object-create-001',
    body: { payerAlias: 'object.payer', currency: 'PEN', amount: '15.00', note: 'Objeto autorizado' },
  })
  assert.equal(paymentRequest.status, 201)
  const paymentRequestId = paymentRequest.data.paymentRequest.id

  const outsiderCancel = await request(`/api/payment-requests/${paymentRequestId}/cancel`, {
    method: 'POST', token: outsider.data.token, body: {},
  })
  assert.equal(outsiderCancel.status, 403)
  assert.equal(outsiderCancel.data.error.code, 'PAYMENT_REQUEST_FORBIDDEN')

  const requesterPayKey = 'issue34-object-requester-pay-001'
  const requesterPay = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: requester.data.token, idempotencyKey: requesterPayKey, body: {},
  })
  assert.equal(requesterPay.status, 403)
  assert.equal(requesterPay.data.error.code, 'PAYMENT_REQUEST_FORBIDDEN')

  const outsiderPayKey = 'issue34-object-outsider-pay-001'
  const outsiderPay = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: outsider.data.token, idempotencyKey: outsiderPayKey, body: {},
  })
  assert.equal(outsiderPay.status, 403)
  assert.equal(outsiderPay.data.error.code, 'PAYMENT_REQUEST_FORBIDDEN')

  const requesterCreated = await request('/api/payment-requests/created?status=PENDING', { token: requester.data.token })
  const payerReceived = await request('/api/payment-requests/received?status=PENDING', { token: payer.data.token })
  const outsiderCreated = await request('/api/payment-requests/created?status=PENDING', { token: outsider.data.token })
  const outsiderReceived = await request('/api/payment-requests/received?status=PENDING', { token: outsider.data.token })

  assert.deepEqual(requesterCreated.data.paymentRequests.map((item) => item.id), [paymentRequestId])
  assert.deepEqual(payerReceived.data.paymentRequests.map((item) => item.id), [paymentRequestId])
  assert.deepEqual(outsiderCreated.data.paymentRequests, [])
  assert.deepEqual(outsiderReceived.data.paymentRequests, [])

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(auditDb.prepare('SELECT status FROM payment_requests WHERE id = ?').get(paymentRequestId).status, 'PENDING')
  assert.equal(auditDb.prepare("SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'").get().count, 0)
  assert.equal(auditDb.prepare(`
    SELECT COUNT(*) AS count FROM idempotency_records
    WHERE idempotency_key IN (?, ?)
  `).get(requesterPayKey, outsiderPayKey).count, 0)
  auditDb.close()
})

test('Issue #34: transaction visibility is participant-only through activity projection', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-issue34-transaction-auth-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const sender = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Tx Sender', phone: '+51978200001', alias: 'tx.sender', password: 'ClaveSegura123' },
  })
  const recipient = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Tx Recipient', phone: '+51978200002', alias: 'tx.recipient', password: 'ClaveSegura123' },
  })
  const outsider = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Tx Outsider', phone: '+51978200003', alias: 'tx.outsider', password: 'ClaveSegura123' },
  })

  for (const user of [sender, recipient, outsider]) {
    const verify = await request('/api/demo/verify', { method: 'POST', token: user.data.token })
    assert.equal(verify.status, 200)
  }
  await request('/api/demo/fund', {
    method: 'POST', token: sender.data.token, idempotencyKey: 'issue34-tx-fund-001', body: { amount: '20.00' },
  })

  const transfer = await request('/api/transfers', {
    method: 'POST',
    token: sender.data.token,
    idempotencyKey: 'issue34-tx-transfer-001',
    body: { recipientAlias: 'tx.recipient', amount: '7.00', note: 'Visibilidad' },
  })
  assert.equal(transfer.status, 201)
  const transactionId = transfer.data.transaction.id

  const senderActivity = await request('/api/activity', { token: sender.data.token })
  const recipientActivity = await request('/api/activity', { token: recipient.data.token })
  const outsiderActivity = await request('/api/activity', { token: outsider.data.token })

  assert.equal(senderActivity.data.activity.some((item) => item.id === transactionId), true)
  assert.equal(recipientActivity.data.activity.some((item) => item.id === transactionId), true)
  assert.equal(outsiderActivity.data.activity.some((item) => item.id === transactionId), false)
})

test('Issue #34: disabled operation and receipt paths stay non-success and side-effect-free', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-issue34-disabled-paths-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Disabled Paths', phone: '+51978300001', alias: 'disabled.paths', password: 'ClaveSegura123' },
  })
  assert.equal(user.status, 201)

  const disabledPaths = [
    '/api/payment-operations/not-created',
    '/api/payment-operations/not-created/success',
    '/api/transactions/not-created',
    '/api/receipts/not-created',
  ]

  for (const path of disabledPaths) {
    const response = await request(path, { token: user.data.token })
    assert.equal(response.status, 404)
    assert.equal(response.data.error.code, 'NOT_FOUND')
  }

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(auditDb.prepare('SELECT COUNT(*) AS count FROM ledger_transactions').get().count, 0)
  assert.equal(auditDb.prepare('SELECT COUNT(*) AS count FROM idempotency_records').get().count, 0)
  assert.equal(auditDb.prepare('SELECT COUNT(*) AS count FROM payment_requests').get().count, 0)
  auditDb.close()
})

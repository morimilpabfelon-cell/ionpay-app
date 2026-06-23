import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createIonPayServer } from '../app.mjs'
import { createDatabase } from '../db.mjs'
import { createLedger, LedgerError } from '../ledger.mjs'
import { MoneyError, multiplyDivideMinor, parsePenMinor } from '../money.mjs'

async function startApi({ dbPath = ':memory:' } = {}) {
  const app = createIonPayServer({ dbPath, demoMode: true })
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

test('flujo financiero V1: registro, KYC, fondeo, envío y actividad PEN', async (context) => {
  const { app, request } = await startApi()
  context.after(() => app.close())

  const health = await request('/api/health')
  assert.equal(health.status, 200)
  assert.equal(health.data.ok, true)

  const alice = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Alice Rivera', phone: '+51911111111', alias: 'alice.ion', password: 'ClaveSegura123' },
  })
  const bob = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Bob Torres', phone: '+51922222222', alias: 'bob.ion', password: 'OtraClave123' },
  })

  assert.equal(alice.status, 201)
  assert.equal(alice.data.user.kycStatus, 'PENDING')
  assert.equal(bob.status, 201)

  const blockedTransfer = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, body: { recipientAlias: 'bob.ion', amount: '10.00' },
  })
  assert.equal(blockedTransfer.status, 403)
  assert.equal(blockedTransfer.data.error.code, 'KYC_REQUIRED')

  const verifyAlice = await request('/api/demo/verify', { method: 'POST', token: alice.data.token })
  const verifyBob = await request('/api/demo/verify', { method: 'POST', token: bob.data.token })
  assert.equal(verifyAlice.data.user.kycStatus, 'VERIFIED')
  assert.equal(verifyBob.data.user.kycStatus, 'VERIFIED')

  const funding = await request('/api/demo/fund', { method: 'POST', token: alice.data.token, idempotencyKey: 'flow-funding-001', body: { amount: '1000.00' } })
  assert.equal(funding.status, 201)
  assert.deepEqual(funding.data.balances, { PEN: 1000 })

  const transfer = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, idempotencyKey: 'flow-transfer-001', body: { recipientAlias: '@bob.ion', amount: '125.50', note: 'Prueba' },
  })
  assert.equal(transfer.status, 201)
  assert.equal(transfer.data.transaction.status, 'COMPLETED')
  assert.deepEqual(transfer.data.balances, { PEN: 874.5 })

  const bobWallet = await request('/api/wallet', { token: bob.data.token })
  assert.deepEqual(bobWallet.data.balances, { PEN: 125.5 })
  assert.equal(Object.hasOwn(bobWallet.data.balances, 'USDT'), false)

  const insufficient = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, idempotencyKey: 'flow-insufficient-001', body: { recipientAlias: 'bob.ion', amount: '5000.00' },
  })
  assert.equal(insufficient.status, 409)
  assert.equal(insufficient.data.error.code, 'INSUFFICIENT_FUNDS')

  const activity = await request('/api/activity', { token: alice.data.token })
  assert.equal(activity.status, 200)
  assert.ok(activity.data.activity.some((item) => item.type === 'TRANSFER' && item.amount === -125.5))
})

test('superficie V1 conserva cuentas USDT internas y bloquea conversiones sin crear ledger', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-v1-surface-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const withoutToken = await request('/api/conversions', {
    method: 'POST', body: { fromCurrency: 'PEN', amount: '1.00' },
  })
  assert.equal(withoutToken.status, 401)
  assert.equal(withoutToken.data.error.code, 'UNAUTHORIZED')

  const invalidToken = await request('/api/conversions', {
    method: 'POST', token: 'token-invalido', body: { fromCurrency: 'PEN', amount: '1.00' },
  })
  assert.equal(invalidToken.status, 401)
  assert.equal(invalidToken.data.error.code, 'INVALID_SESSION')

  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Surface Test', phone: '+51977777777', alias: 'surface.test', password: 'ClaveSegura123' },
  })
  assert.equal(registration.status, 201)
  const recipient = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Recipient Test', phone: '+51988888888', alias: 'recipient.test', password: 'ClaveSegura123' },
  })
  assert.equal(recipient.status, 201)

  const internalDb = new DatabaseSync(dbPath, { readOnly: true })
  const internalAccounts = internalDb.prepare(`
    SELECT currency, balance
    FROM accounts
    WHERE owner_type = 'USER' AND owner_id = ? AND kind = 'AVAILABLE'
    ORDER BY currency
  `).all(registration.data.user.id)
  internalDb.close()
  assert.deepEqual(internalAccounts.map((account) => account.currency), ['PEN', 'USDT'])

  const wallet = await request('/api/wallet', { token: registration.data.token })
  assert.equal(wallet.status, 200)
  assert.deepEqual(wallet.data.balances, { PEN: 0 })
  assert.equal(Object.hasOwn(wallet.data.balances, 'USDT'), false)

  const unverifiedConversion = await request('/api/conversions', {
    method: 'POST', token: registration.data.token, body: { fromCurrency: 'PEN', amount: '1.00' },
  })
  assert.equal(unverifiedConversion.status, 409)
  assert.equal(unverifiedConversion.data.error.code, 'FEATURE_NOT_AVAILABLE')

  await request('/api/demo/verify', { method: 'POST', token: registration.data.token })
  await request('/api/demo/verify', { method: 'POST', token: recipient.data.token })

  const funding = await request('/api/demo/fund', {
    method: 'POST', token: registration.data.token, idempotencyKey: 'surface-funding-001', body: { amount: '1000.00' },
  })
  assert.equal(funding.status, 201)

  const historicalDb = new DatabaseSync(dbPath)
  const historicalLedger = createLedger(historicalDb)
  const accountByCurrency = historicalDb.prepare(`
    SELECT id FROM accounts
    WHERE owner_type = ? AND owner_id = ? AND currency = ? AND kind = ?
  `)
  const userPen = accountByCurrency.get('USER', registration.data.user.id, 'PEN', 'AVAILABLE')
  const userUsdt = accountByCurrency.get('USER', registration.data.user.id, 'USDT', 'AVAILABLE')
  const treasuryPen = accountByCurrency.get('SYSTEM', 'IONPAY', 'PEN', 'TREASURY')
  const treasuryUsdt = accountByCurrency.get('SYSTEM', 'IONPAY', 'USDT', 'TREASURY')
  historicalLedger.post({
    type: 'CONVERSION',
    reference: `HISTORICAL-${randomUUID()}`,
    entries: [
      { accountId: userPen.id, currency: 'PEN', amount: -37_500 },
      { accountId: treasuryPen.id, currency: 'PEN', amount: 37_500 },
      { accountId: treasuryUsdt.id, currency: 'USDT', amount: -10_000 },
      { accountId: userUsdt.id, currency: 'USDT', amount: 10_000 },
    ],
    metadata: { historical: true },
  })
  historicalDb.close()

  const transfer = await request('/api/transfers', {
    method: 'POST',
    token: registration.data.token,
    idempotencyKey: 'surface-transfer-001',
    body: { recipientAlias: 'recipient.test', amount: '25.00' },
  })
  assert.equal(transfer.status, 201)

  const activity = await request('/api/activity', { token: registration.data.token })
  assert.equal(activity.status, 200)
  assert.ok(activity.data.activity.some((item) => item.type === 'DEMO_FUNDING' && item.currency === 'PEN'))
  assert.ok(activity.data.activity.some((item) => item.type === 'TRANSFER' && item.currency === 'PEN'))
  assert.equal(activity.data.activity.some((item) => item.type === 'CONVERSION'), false)
  assert.equal(activity.data.activity.some((item) => item.currency === 'USDT'), false)

  const walletAfterHistory = await request('/api/wallet', { token: registration.data.token })
  assert.deepEqual(walletAfterHistory.data.balances, { PEN: 600 })

  const beforeDb = new DatabaseSync(dbPath, { readOnly: true })
  const beforeTransactions = beforeDb.prepare('SELECT COUNT(*) AS count FROM ledger_transactions').get().count
  const beforeBalances = beforeDb.prepare(`
    SELECT currency, balance
    FROM accounts
    WHERE owner_type = 'USER' AND owner_id = ?
    ORDER BY currency
  `).all(registration.data.user.id)
  beforeDb.close()

  const blockedConversion = await request('/api/conversions', {
    method: 'POST', token: registration.data.token, body: { fromCurrency: 'PEN', amount: '375.00' },
  })
  assert.equal(blockedConversion.status, 409)
  assert.equal(blockedConversion.data.error.code, 'FEATURE_NOT_AVAILABLE')
  assert.equal(blockedConversion.data.error.message, 'La conversión no está disponible en esta versión.')

  const afterDb = new DatabaseSync(dbPath, { readOnly: true })
  const afterTransactions = afterDb.prepare('SELECT COUNT(*) AS count FROM ledger_transactions').get().count
  const afterBalances = afterDb.prepare(`
    SELECT currency, balance
    FROM accounts
    WHERE owner_type = 'USER' AND owner_id = ?
    ORDER BY currency
  `).all(registration.data.user.id)
  afterDb.close()
  assert.equal(afterTransactions, beforeTransactions)
  assert.deepEqual(afterBalances, beforeBalances)
})

test('autenticación rechaza credenciales incorrectas y duplicados', async (context) => {
  const { app, request } = await startApi()
  context.after(() => app.close())

  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Ana Ruiz', phone: '+51933333333', alias: 'ana.ion', password: 'ClaveSegura123' },
  })
  assert.equal(registration.status, 201)

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Ana Dos', phone: '+51933333333', alias: 'otra.ion', password: 'ClaveSegura123' },
  })
  assert.equal(duplicate.status, 409)

  const wrongLogin = await request('/api/auth/login', {
    method: 'POST', body: { phone: '+51933333333', password: 'ClaveEquivocada' },
  })
  assert.equal(wrongLogin.status, 401)

  const login = await request('/api/auth/login', {
    method: 'POST', body: { phone: '+51933333333', password: 'ClaveSegura123' },
  })
  assert.equal(login.status, 200)
  assert.equal(login.data.user.alias, 'ana.ion')
})

test('API protege endpoints y rechaza montos monetarios inválidos', async (context) => {
  const { app, request } = await startApi()
  context.after(() => app.close())

  const withoutToken = await request('/api/wallet')
  assert.equal(withoutToken.status, 401)
  assert.equal(withoutToken.data.error.code, 'UNAUTHORIZED')

  const invalidToken = await request('/api/wallet', { token: 'token-invalido' })
  assert.equal(invalidToken.status, 401)
  assert.equal(invalidToken.data.error.code, 'INVALID_SESSION')

  const alice = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Alice Test', phone: '+51944444444', alias: 'alice.test', password: 'ClaveSegura123' },
  })
  const bob = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Bob Test', phone: '+51955555555', alias: 'bob.test', password: 'ClaveSegura123' },
  })
  await request('/api/demo/verify', { method: 'POST', token: alice.data.token })
  await request('/api/demo/verify', { method: 'POST', token: bob.data.token })

  const selfPayment = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, idempotencyKey: 'money-self-001', body: { recipientAlias: 'alice.test', amount: '1.00' },
  })
  assert.equal(selfPayment.status, 400)
  assert.equal(selfPayment.data.error.code, 'SAME_ACCOUNT')

  const invalidAmounts = [
    '1.001',
    '0',
    '-1.00',
    'NaN',
    'Infinity',
    '1e3',
    '',
    '90071992547409.92',
    1,
  ]
  for (const [index, amount] of invalidAmounts.entries()) {
    const result = await request('/api/transfers', {
      method: 'POST', token: alice.data.token, idempotencyKey: `money-invalid-${index}`, body: { recipientAlias: 'bob.test', amount },
    })
    assert.equal(result.status, 400, `El monto ${JSON.stringify(amount)} debe ser rechazado.`)
    assert.equal(result.data.error.code, 'INVALID_AMOUNT')
  }
})

test('Idempotency-Key respeta los límites de 8 a 128 caracteres', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-idempotency-key-limits-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Key Limits', phone: '+51970000004', alias: 'key.limits', password: 'ClaveSegura123' },
  })

  const sevenCharacters = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: 'a'.repeat(7), body: { amount: '1.00' },
  })
  assert.equal(sevenCharacters.status, 400)
  assert.equal(sevenCharacters.data.error.code, 'INVALID_IDEMPOTENCY_KEY')

  const eightCharacters = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: 'A1._-:b2', body: { amount: '1.00' },
  })
  assert.equal(eightCharacters.status, 201)

  const oneHundredTwentyEightCharacters = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: 'K'.repeat(128), body: { amount: '2.00' },
  })
  assert.equal(oneHundredTwentyEightCharacters.status, 201)

  const oneHundredTwentyNineCharacters = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: 'z'.repeat(129), body: { amount: '1.00' },
  })
  assert.equal(oneHundredTwentyNineCharacters.status, 400)
  assert.equal(oneHundredTwentyNineCharacters.data.error.code, 'INVALID_IDEMPOTENCY_KEY')

  const wallet = await request('/api/wallet', { token: user.data.token })
  assert.deepEqual(wallet.data.balances, { PEN: 3 })
  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(auditDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ?`).get(user.data.user.id).count, 2)
  assert.equal(auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'DEMO_FUNDING'`).get().count, 2)
  auditDb.close()
})

test('transferencias aplican idempotencia, conflictos, aislamiento y rollback seguro', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-transfer-idempotency-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const unauthenticated = await request('/api/transfers', {
    method: 'POST', body: { recipientAlias: 'nobody', amount: '1.00' },
  })
  assert.equal(unauthenticated.status, 401)
  assert.equal(unauthenticated.data.error.code, 'UNAUTHORIZED')

  const invalidSession = await request('/api/transfers', {
    method: 'POST', token: 'token-invalido', body: { recipientAlias: 'nobody', amount: '1.00' },
  })
  assert.equal(invalidSession.status, 401)
  assert.equal(invalidSession.data.error.code, 'INVALID_SESSION')

  const alice = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Alice Idempotency', phone: '+51970000001', alias: 'alice.idem', password: 'ClaveSegura123' },
  })
  const bob = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Bob Idempotency', phone: '+51970000002', alias: 'bob.idem', password: 'ClaveSegura123' },
  })
  await request('/api/demo/verify', { method: 'POST', token: alice.data.token })
  await request('/api/demo/verify', { method: 'POST', token: bob.data.token })

  const missingKey = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, body: { recipientAlias: 'bob.idem', amount: '1.00' },
  })
  assert.equal(missingKey.status, 400)
  assert.equal(missingKey.data.error.code, 'IDEMPOTENCY_KEY_REQUIRED')

  const invalidKey = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, idempotencyKey: 'bad key!', body: { recipientAlias: 'bob.idem', amount: '1.00' },
  })
  assert.equal(invalidKey.status, 400)
  assert.equal(invalidKey.data.error.code, 'INVALID_IDEMPOTENCY_KEY')

  const missingRecipientKey = 'transfer-missing-recipient-001'
  const missingRecipient = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, idempotencyKey: missingRecipientKey,
    body: { recipientAlias: 'missing.recipient', amount: '1.00' },
  })
  assert.equal(missingRecipient.status, 404)
  assert.equal(missingRecipient.data.error.code, 'RECIPIENT_NOT_FOUND')
  const missingRecipientAudit = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(missingRecipientAudit.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(alice.data.user.id, missingRecipientKey).count, 0)
  assert.equal(missingRecipientAudit.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'TRANSFER'`).get().count, 0)
  missingRecipientAudit.close()

  const funding = await request('/api/demo/fund', {
    method: 'POST', token: alice.data.token, idempotencyKey: 'transfer-setup-fund-001', body: { amount: '100.00' },
  })
  assert.equal(funding.status, 201)

  const transferKey = 'transfer-idem-001'
  const [firstTransfer, retryTransfer] = await Promise.all([
    request('/api/transfers', {
      method: 'POST', token: alice.data.token, idempotencyKey: transferKey,
      body: { recipientAlias: 'bob.idem', amount: '25.00', note: 'Reintento seguro' },
    }),
    request('/api/transfers', {
      method: 'POST', token: alice.data.token, idempotencyKey: transferKey,
      body: { note: 'Reintento seguro', amount: '25.0', recipientAlias: '@bob.idem' },
    }),
  ])
  assert.equal(firstTransfer.status, 201)
  assert.equal(retryTransfer.status, 201)
  assert.deepEqual(retryTransfer.data, firstTransfer.data)
  assert.equal(retryTransfer.data.transaction.id, firstTransfer.data.transaction.id)
  assert.equal(retryTransfer.data.transaction.reference, firstTransfer.data.transaction.reference)

  const aliceWallet = await request('/api/wallet', { token: alice.data.token })
  const bobWallet = await request('/api/wallet', { token: bob.data.token })
  assert.deepEqual(aliceWallet.data.balances, { PEN: 75 })
  assert.deepEqual(bobWallet.data.balances, { PEN: 25 })

  const reusedPayload = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, idempotencyKey: transferKey,
    body: { recipientAlias: 'bob.idem', amount: '30.00', note: 'Reintento seguro' },
  })
  assert.equal(reusedPayload.status, 409)
  assert.equal(reusedPayload.data.error.code, 'IDEMPOTENCY_KEY_REUSED')

  const reusedEndpoint = await request('/api/demo/fund', {
    method: 'POST', token: alice.data.token, idempotencyKey: transferKey, body: { amount: '10.00' },
  })
  assert.equal(reusedEndpoint.status, 409)
  assert.equal(reusedEndpoint.data.error.code, 'IDEMPOTENCY_KEY_REUSED')

  const beforeInsufficient = await request('/api/wallet', { token: alice.data.token })
  assert.deepEqual(beforeInsufficient.data.balances, aliceWallet.data.balances)
  const insufficientKey = 'transfer-insufficient-001'
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const insufficient = await request('/api/transfers', {
      method: 'POST', token: alice.data.token, idempotencyKey: insufficientKey,
      body: { recipientAlias: 'bob.idem', amount: '1000.00' },
    })
    assert.equal(insufficient.status, 409)
    assert.equal(insufficient.data.error.code, 'INSUFFICIENT_FUNDS')
  }
  const afterInsufficient = await request('/api/wallet', { token: alice.data.token })
  assert.deepEqual(afterInsufficient.data.balances, beforeInsufficient.data.balances)

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  const transferCount = auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'TRANSFER'`).get().count
  const transferRecord = auditDb.prepare(`SELECT * FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(alice.data.user.id, transferKey)
  const insufficientRecords = auditDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(alice.data.user.id, insufficientKey).count
  auditDb.close()
  assert.equal(transferCount, 1)
  assert.equal(transferRecord.transaction_id, firstTransfer.data.transaction.id)
  assert.equal(insufficientRecords, 0)

  const isolatedOwner = await request('/api/demo/fund', {
    method: 'POST', token: bob.data.token, idempotencyKey: transferKey, body: { amount: '5.00' },
  })
  assert.equal(isolatedOwner.status, 201)
  const bobAfterIsolatedReuse = await request('/api/wallet', { token: bob.data.token })
  assert.deepEqual(bobAfterIsolatedReuse.data.balances, { PEN: 30 })
})

test('fondeo demo exige key y acredita una sola vez por payload', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-funding-idempotency-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const unauthenticated = await request('/api/demo/fund', { method: 'POST', body: { amount: '1.00' } })
  assert.equal(unauthenticated.status, 401)
  assert.equal(unauthenticated.data.error.code, 'UNAUTHORIZED')

  const invalidSession = await request('/api/demo/fund', {
    method: 'POST', token: 'token-invalido', body: { amount: '1.00' },
  })
  assert.equal(invalidSession.status, 401)
  assert.equal(invalidSession.data.error.code, 'INVALID_SESSION')

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Funding Idempotency', phone: '+51970000003', alias: 'funding.idem', password: 'ClaveSegura123' },
  })

  const missingKey = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, body: { amount: '1.00' },
  })
  assert.equal(missingKey.status, 400)
  assert.equal(missingKey.data.error.code, 'IDEMPOTENCY_KEY_REQUIRED')

  const invalidKey = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: 'short!', body: { amount: '1.00' },
  })
  assert.equal(invalidKey.status, 400)
  assert.equal(invalidKey.data.error.code, 'INVALID_IDEMPOTENCY_KEY')

  const fundingKey = 'funding-idem-001'
  const firstFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: fundingKey, body: { amount: '50.00' },
  })
  const retryFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: fundingKey, body: { amount: '50.0' },
  })
  assert.equal(firstFunding.status, 201)
  assert.equal(retryFunding.status, 201)
  assert.deepEqual(retryFunding.data, firstFunding.data)

  const reusedPayload = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: fundingKey, body: { amount: '51.00' },
  })
  assert.equal(reusedPayload.status, 409)
  assert.equal(reusedPayload.data.error.code, 'IDEMPOTENCY_KEY_REUSED')

  const invalidRetryKey = 'funding-invalid-retry-001'
  const invalidAmount = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: invalidRetryKey, body: { amount: '1.001' },
  })
  assert.equal(invalidAmount.status, 400)
  assert.equal(invalidAmount.data.error.code, 'INVALID_AMOUNT')
  const correctedRetry = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: invalidRetryKey, body: { amount: '1.00' },
  })
  assert.equal(correctedRetry.status, 201)

  const wallet = await request('/api/wallet', { token: user.data.token })
  assert.deepEqual(wallet.data.balances, { PEN: 51 })

  const rollbackKey = 'funding-rollback-001'
  const triggerDb = new DatabaseSync(dbPath)
  triggerDb.exec(`
    CREATE TRIGGER force_idempotency_failure
    BEFORE INSERT ON idempotency_records
    WHEN NEW.idempotency_key = '${rollbackKey}'
    BEGIN
      SELECT RAISE(ABORT, 'forced idempotency failure');
    END;
  `)
  triggerDb.close()

  const originalConsoleError = console.error
  let forcedFailure
  try {
    console.error = () => {}
    forcedFailure = await request('/api/demo/fund', {
      method: 'POST', token: user.data.token, idempotencyKey: rollbackKey, body: { amount: '10.00' },
    })
  } finally {
    console.error = originalConsoleError
  }
  assert.equal(forcedFailure.status, 500)
  assert.equal(forcedFailure.data.error.code, 'INTERNAL_ERROR')
  const walletAfterFailure = await request('/api/wallet', { token: user.data.token })
  assert.deepEqual(walletAfterFailure.data.balances, { PEN: 51 })

  const rollbackAudit = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(rollbackAudit.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'DEMO_FUNDING'`).get().count, 2)
  assert.equal(rollbackAudit.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(user.data.user.id, rollbackKey).count, 0)
  rollbackAudit.close()

  const dropTriggerDb = new DatabaseSync(dbPath)
  dropTriggerDb.exec('DROP TRIGGER force_idempotency_failure')
  dropTriggerDb.close()
  const retryAfterRollback = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: rollbackKey, body: { amount: '10.00' },
  })
  assert.equal(retryAfterRollback.status, 201)
  const walletAfterRollbackRetry = await request('/api/wallet', { token: user.data.token })
  assert.deepEqual(walletAfterRollbackRetry.data.balances, { PEN: 61 })

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  const fundingCount = auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'DEMO_FUNDING'`).get().count
  const stored = auditDb.prepare(`SELECT * FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(user.data.user.id, fundingKey)
  auditDb.close()
  assert.equal(fundingCount, 3)
  assert.equal(stored.transaction_id, firstFunding.data.transaction.id)
})

test('parser monetario acepta límites exactos y rechaza formatos ambiguos', () => {
  assert.equal(parsePenMinor('90071992547409.91'), Number.MAX_SAFE_INTEGER)
  assert.equal(parsePenMinor(' 10.00 '), 1000)
  assert.equal(parsePenMinor('000.01'), 1)

  for (const amount of ['90071992547409.92', '.', '1.', '01.234']) {
    assert.throws(
      () => parsePenMinor(amount),
      (error) => error instanceof MoneyError && error.code === 'INVALID_AMOUNT',
      `El monto ${JSON.stringify(amount)} debe ser rechazado.`,
    )
  }

  assert.throws(
    () => multiplyDivideMinor(1, 100, 375),
    (error) => error instanceof MoneyError && error.code === 'INVALID_AMOUNT',
  )
})

test('fondeo demo rechaza montos inválidos', async (context) => {
  const { app, request } = await startApi()
  context.after(() => app.close())

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Money Test', phone: '+51966666666', alias: 'money.test', password: 'ClaveSegura123' },
  })
  await request('/api/demo/verify', { method: 'POST', token: user.data.token })

  const invalidFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: 'money-funding-invalid-001', body: { amount: '1.001' },
  })
  assert.equal(invalidFunding.status, 400)
  assert.equal(invalidFunding.data.error.code, 'INVALID_AMOUNT')
})

function createLedgerFixture() {
  const db = createDatabase(':memory:')
  const ledger = createLedger(db)
  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, owner_type, owner_id, currency, kind, balance, created_at)
    VALUES (?, 'USER', ?, 'PEN', 'AVAILABLE', 0, ?)
  `)
  const createdAt = new Date().toISOString()
  const senderId = randomUUID()
  const recipientId = randomUUID()
  insertAccount.run(senderId, 'sender', createdAt)
  insertAccount.run(recipientId, 'recipient', createdAt)
  const treasury = db.prepare(`SELECT id FROM accounts WHERE owner_type = 'SYSTEM' AND owner_id = 'IONPAY' AND currency = 'PEN'`).get()

  ledger.post({
    type: 'TEST_FUNDING',
    reference: `TEST-${randomUUID()}`,
    entries: [
      { accountId: treasury.id, currency: 'PEN', amount: -1000 },
      { accountId: senderId, currency: 'PEN', amount: 1000 },
    ],
  })

  return { db, ledger, senderId, recipientId }
}

test('ledger mantiene balanceada una transferencia exitosa', () => {
  const { db, ledger, senderId, recipientId } = createLedgerFixture()
  try {
    const transaction = ledger.post({
      type: 'TRANSFER',
      reference: `TEST-${randomUUID()}`,
      entries: [
        { accountId: senderId, currency: 'PEN', amount: -250 },
        { accountId: recipientId, currency: 'PEN', amount: 250 },
      ],
    })

    const sum = db.prepare('SELECT SUM(amount) AS total FROM ledger_entries WHERE transaction_id = ?').get(transaction.id)
    assert.equal(sum.total, 0)
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(senderId).balance, 750)
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(recipientId).balance, 250)
  } finally {
    db.close()
  }
})

test('ledger revierte fondos insuficientes sin cambiar balances ni crear transacción', () => {
  const { db, ledger, senderId, recipientId } = createLedgerFixture()
  try {
    const beforeBalances = db.prepare('SELECT id, balance FROM accounts WHERE id IN (?, ?) ORDER BY id').all(senderId, recipientId)
    const beforeTransactions = db.prepare('SELECT COUNT(*) AS count FROM ledger_transactions').get().count

    assert.throws(
      () => ledger.post({
        type: 'TRANSFER',
        reference: `TEST-${randomUUID()}`,
        entries: [
          { accountId: senderId, currency: 'PEN', amount: -1001 },
          { accountId: recipientId, currency: 'PEN', amount: 1001 },
        ],
      }),
      (error) => error instanceof LedgerError && error.code === 'INSUFFICIENT_FUNDS',
    )

    const afterBalances = db.prepare('SELECT id, balance FROM accounts WHERE id IN (?, ?) ORDER BY id').all(senderId, recipientId)
    const afterTransactions = db.prepare('SELECT COUNT(*) AS count FROM ledger_transactions').get().count
    assert.deepEqual(afterBalances, beforeBalances)
    assert.equal(afterTransactions, beforeTransactions)
  } finally {
    db.close()
  }
})

test('ledger agrupa entradas duplicadas y reconcilia balances con sus asientos', () => {
  const { db, ledger, senderId, recipientId } = createLedgerFixture()
  try {
    const transaction = ledger.post({
      type: 'TRANSFER',
      reference: `TEST-${randomUUID()}`,
      entries: [
        { accountId: senderId, currency: 'PEN', amount: -200 },
        { accountId: senderId, currency: 'PEN', amount: -300 },
        { accountId: recipientId, currency: 'PEN', amount: 500 },
      ],
    })

    const entries = db.prepare('SELECT account_id, amount FROM ledger_entries WHERE transaction_id = ? ORDER BY account_id').all(transaction.id)
    assert.equal(entries.length, 2)
    assert.equal(entries.reduce((total, entry) => total + entry.amount, 0), 0)
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(senderId).balance, 500)
    assert.equal(db.prepare('SELECT balance FROM accounts WHERE id = ?').get(recipientId).balance, 500)

    const reconciled = db.prepare(`
      SELECT a.id, a.balance, COALESCE(SUM(e.amount), 0) AS entry_total
      FROM accounts a
      LEFT JOIN ledger_entries e ON e.account_id = a.id
      WHERE a.owner_type = 'USER'
      GROUP BY a.id, a.balance
    `).all()
    assert.ok(reconciled.length >= 2)
    for (const account of reconciled) assert.equal(account.balance, account.entry_total)
  } finally {
    db.close()
  }
})

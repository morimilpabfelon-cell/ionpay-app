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

async function startApi({ dbPath = ':memory:', now } = {}) {
  const app = createIonPayServer({ dbPath, demoMode: true, now })
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

async function withoutConsoleError(callback) {
  const originalConsoleError = console.error
  try {
    console.error = () => {}
    return await callback()
  } finally {
    console.error = originalConsoleError
  }
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

test('cuenta y wallet V1 derivan estado y bloquean configuraciones no operables', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-account-wallet-v1-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Wallet Foundation', phone: '+51976000001', alias: 'wallet.foundation', password: 'ClaveSegura123' },
  })
  assert.equal(user.status, 201)

  const registrationDb = new DatabaseSync(dbPath)
  const v1WalletRows = registrationDb.prepare(`
    SELECT * FROM accounts
    WHERE owner_type = 'USER' AND owner_id = ? AND currency = 'PEN' AND kind = 'AVAILABLE'
  `).all(user.data.user.id)
  assert.equal(v1WalletRows.length, 1)
  assert.equal(v1WalletRows[0].balance, 0)
  assert.throws(() => registrationDb.prepare(`
    INSERT INTO accounts (id, owner_type, owner_id, currency, kind, balance, created_at)
    VALUES (?, 'USER', ?, 'PEN', 'AVAILABLE', 0, ?)
  `).run(randomUUID(), user.data.user.id, new Date().toISOString()), /UNIQUE constraint failed/)
  registrationDb.close()

  const pendingWallet = await request('/api/wallet', { token: user.data.token })
  assert.equal(pendingWallet.status, 200)
  assert.deepEqual(pendingWallet.data, {
    balances: { PEN: 0 },
    account: { status: 'pending_verification' },
    wallet: { currency: 'PEN', status: 'active', availableBalance: 0, heldBalance: 0 },
  })
  assert.equal(Object.hasOwn(pendingWallet.data.balances, 'USDT'), false)

  const pendingFundingKey = 'wallet-pending-fund-001'
  const pendingFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: pendingFundingKey, body: { amount: '1.00' },
  })
  assert.equal(pendingFunding.status, 403)
  assert.equal(pendingFunding.data.error.code, 'KYC_REQUIRED')

  await request('/api/demo/verify', { method: 'POST', token: user.data.token })
  const activeWallet = await request('/api/wallet', { token: user.data.token })
  assert.equal(activeWallet.status, 200)
  assert.equal(activeWallet.data.account.status, 'active')
  assert.equal(activeWallet.data.wallet.status, 'active')

  const blockedDb = new DatabaseSync(dbPath)
  blockedDb.prepare(`UPDATE users SET kyc_status = 'BLOCKED' WHERE id = ?`).run(user.data.user.id)
  blockedDb.close()
  const blockedWallet = await request('/api/wallet', { token: user.data.token })
  assert.equal(blockedWallet.status, 200)
  assert.equal(blockedWallet.data.account.status, 'blocked')
  const blockedFundingKey = 'wallet-blocked-fund-001'
  const blockedFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: blockedFundingKey, body: { amount: '1.00' },
  })
  assert.equal(blockedFunding.status, 403)
  assert.equal(blockedFunding.data.error.code, 'ACCOUNT_BLOCKED')

  const missingDb = new DatabaseSync(dbPath)
  missingDb.prepare(`UPDATE users SET kyc_status = 'VERIFIED' WHERE id = ?`).run(user.data.user.id)
  missingDb.prepare(`
    DELETE FROM accounts
    WHERE owner_type = 'USER' AND owner_id = ? AND currency = 'PEN' AND kind = 'AVAILABLE'
  `).run(user.data.user.id)
  missingDb.close()
  const missingFundingKey = 'wallet-missing-fund-001'
  const missingFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: missingFundingKey, body: { amount: '1.00' },
  })
  assert.equal(missingFunding.status, 409)
  assert.equal(missingFunding.data.error.code, 'WALLET_NOT_OPERABLE')
  const missingWallet = await request('/api/wallet', { token: user.data.token })
  assert.equal(missingWallet.status, 409)
  assert.equal(missingWallet.data.error.code, 'WALLET_NOT_OPERABLE')

  const negativeDb = new DatabaseSync(dbPath)
  negativeDb.prepare(`
    INSERT INTO accounts (id, owner_type, owner_id, currency, kind, balance, created_at)
    VALUES (?, 'USER', ?, 'PEN', 'AVAILABLE', -1, ?)
  `).run(randomUUID(), user.data.user.id, new Date().toISOString())
  negativeDb.close()
  const negativeFundingKey = 'wallet-negative-fund-001'
  const negativeFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: negativeFundingKey, body: { amount: '1.00' },
  })
  assert.equal(negativeFunding.status, 409)
  assert.equal(negativeFunding.data.error.code, 'WALLET_NOT_OPERABLE')
  const negativeWallet = await request('/api/wallet', { token: user.data.token })
  assert.equal(negativeWallet.status, 409)
  assert.equal(negativeWallet.data.error.code, 'WALLET_NOT_OPERABLE')

  const inconsistentDb = new DatabaseSync(dbPath)
  inconsistentDb.prepare(`UPDATE accounts SET balance = 1 WHERE owner_id = ? AND currency = 'PEN'`).run(user.data.user.id)
  inconsistentDb.close()
  const inconsistentFundingKey = 'wallet-inconsistent-fund-001'
  const inconsistentFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, idempotencyKey: inconsistentFundingKey, body: { amount: '1.00' },
  })
  assert.equal(inconsistentFunding.status, 409)
  assert.equal(inconsistentFunding.data.error.code, 'WALLET_NOT_OPERABLE')
  const inconsistentWallet = await request('/api/wallet', { token: user.data.token })
  assert.equal(inconsistentWallet.status, 409)
  assert.equal(inconsistentWallet.data.error.code, 'WALLET_NOT_OPERABLE')

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'DEMO_FUNDING'`).get().count, 0)
  assert.equal(auditDb.prepare(`
    SELECT COUNT(*) AS count FROM idempotency_records
    WHERE idempotency_key IN (?, ?, ?, ?, ?)
  `).get(pendingFundingKey, blockedFundingKey, missingFundingKey, negativeFundingKey, inconsistentFundingKey).count, 0)
  auditDb.close()
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
  await request('/api/demo/verify', { method: 'POST', token: user.data.token })

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
  await request('/api/demo/verify', { method: 'POST', token: user.data.token })

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

test('solicitudes de pago se crean sin mover saldo, son idempotentes y respetan privacidad', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-payment-request-create-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const requester = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Requester Create', phone: '+51971000001', alias: 'requester.create', password: 'ClaveSegura123' },
  })
  const payer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Payer Create', phone: '+51971000002', alias: 'payer.create', password: 'ClaveSegura123' },
  })
  const outsider = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Outsider Create', phone: '+51971000003', alias: 'outsider.create', password: 'ClaveSegura123' },
  })

  const missingCreateKey = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token,
    body: { payerAlias: 'payer.create', currency: 'PEN', amount: '1.00' },
  })
  assert.equal(missingCreateKey.status, 400)
  assert.equal(missingCreateKey.data.error.code, 'IDEMPOTENCY_KEY_REQUIRED')

  const createKey = 'payment-request-create-001'
  const first = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: createKey,
    body: { payerAlias: 'payer.create', currency: 'PEN', amount: '25.00', note: 'Cena', expiresInDays: 7 },
  })
  const retry = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: createKey,
    body: { expiresInDays: 7, note: 'Cena', amount: '25.0', currency: 'PEN', payerAlias: '@payer.create' },
  })
  assert.equal(first.status, 201)
  assert.equal(first.data.paymentRequest.status, 'PENDING')
  assert.equal(first.data.paymentRequest.currency, 'PEN')
  assert.equal(first.data.paymentRequest.amount, 25)
  assert.equal(first.data.paymentRequest.paidTransactionId, null)
  assert.deepEqual(retry.data, first.data)

  const reused = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: createKey,
    body: { payerAlias: 'payer.create', currency: 'PEN', amount: '30.00', note: 'Cena', expiresInDays: 7 },
  })
  assert.equal(reused.status, 409)
  assert.equal(reused.data.error.code, 'IDEMPOTENCY_KEY_REUSED')

  const selfRequest = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-request-self-001',
    body: { payerAlias: 'requester.create', currency: 'PEN', amount: '1.00' },
  })
  assert.equal(selfRequest.status, 400)
  assert.equal(selfRequest.data.error.code, 'SAME_ACCOUNT')

  const invalidAmount = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-request-amount-001',
    body: { payerAlias: 'payer.create', currency: 'PEN', amount: '1.001' },
  })
  assert.equal(invalidAmount.status, 400)
  assert.equal(invalidAmount.data.error.code, 'INVALID_AMOUNT')

  const missingPayer = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-request-missing-001',
    body: { payerAlias: 'missing.payer', currency: 'PEN', amount: '1.00' },
  })
  assert.equal(missingPayer.status, 404)
  assert.equal(missingPayer.data.error.code, 'PAYER_NOT_FOUND')

  const usdtRequest = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-request-usdt-001',
    body: { payerAlias: 'payer.create', currency: 'USDT', amount: '1.00' },
  })
  assert.equal(usdtRequest.status, 400)
  assert.equal(usdtRequest.data.error.code, 'INVALID_CURRENCY')

  const invalidExpiry = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-request-expiry-001',
    body: { payerAlias: 'payer.create', currency: 'PEN', amount: '1.00', expiresInDays: 31 },
  })
  assert.equal(invalidExpiry.status, 400)
  assert.equal(invalidExpiry.data.error.code, 'INVALID_EXPIRY')

  const requesterWallet = await request('/api/wallet', { token: requester.data.token })
  const payerWallet = await request('/api/wallet', { token: payer.data.token })
  assert.deepEqual(requesterWallet.data.balances, { PEN: 0 })
  assert.deepEqual(payerWallet.data.balances, { PEN: 0 })

  const created = await request('/api/payment-requests/created?status=PENDING', { token: requester.data.token })
  const received = await request('/api/payment-requests/received?status=PENDING', { token: payer.data.token })
  const outsiderCreated = await request('/api/payment-requests/created?status=PENDING', { token: outsider.data.token })
  const outsiderReceived = await request('/api/payment-requests/received?status=PENDING', { token: outsider.data.token })
  assert.deepEqual(created.data.paymentRequests.map((item) => item.id), [first.data.paymentRequest.id])
  assert.deepEqual(received.data.paymentRequests.map((item) => item.id), [first.data.paymentRequest.id])
  assert.deepEqual(outsiderCreated.data.paymentRequests, [])
  assert.deepEqual(outsiderReceived.data.paymentRequests, [])
  const invalidStatus = await request('/api/payment-requests/created?status=UNKNOWN', { token: requester.data.token })
  assert.equal(invalidStatus.status, 400)
  assert.equal(invalidStatus.data.error.code, 'INVALID_PAYMENT_REQUEST_STATUS')

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(auditDb.prepare('SELECT COUNT(*) AS count FROM payment_requests').get().count, 1)
  assert.equal(auditDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE endpoint = '/api/payment-requests'`).get().count, 1)
  assert.equal(auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count, 0)
  auditDb.close()
})

test('pago de solicitud es atómico, autorizado e idempotente ante concurrencia', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-payment-request-pay-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const requester = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Requester Pay', phone: '+51972000001', alias: 'requester.pay', password: 'ClaveSegura123' },
  })
  const payer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Payer Pay', phone: '+51972000002', alias: 'payer.pay', password: 'ClaveSegura123' },
  })
  const outsider = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Outsider Pay', phone: '+51972000003', alias: 'outsider.pay', password: 'ClaveSegura123' },
  })
  for (const user of [requester, outsider]) {
    await request('/api/demo/verify', { method: 'POST', token: user.data.token })
  }
  await request('/api/demo/verify', { method: 'POST', token: payer.data.token })
  await request('/api/demo/fund', {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-pay-funding-001', body: { amount: '100.00' },
  })

  const created = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-pay-create-001',
    body: { payerAlias: 'payer.pay', currency: 'PEN', amount: '25.00', note: 'Cuenta compartida' },
  })
  const paymentRequestId = created.data.paymentRequest.id

  const payerStateDb = new DatabaseSync(dbPath)
  payerStateDb.prepare(`UPDATE users SET kyc_status = 'PENDING' WHERE id = ?`).run(payer.data.user.id)
  payerStateDb.close()

  const unverifiedPayer = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-pay-unverified-001', body: {},
  })
  assert.equal(unverifiedPayer.status, 403)
  assert.equal(unverifiedPayer.data.error.code, 'KYC_REQUIRED')
  await request('/api/demo/verify', { method: 'POST', token: payer.data.token })

  const missingPayKey = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: payer.data.token, body: {},
  })
  assert.equal(missingPayKey.status, 400)
  assert.equal(missingPayKey.data.error.code, 'IDEMPOTENCY_KEY_REQUIRED')

  const requesterAttempt = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-pay-requester-001', body: {},
  })
  const outsiderAttempt = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: outsider.data.token, idempotencyKey: 'payment-pay-outsider-001', body: {},
  })
  assert.equal(requesterAttempt.status, 403)
  assert.equal(requesterAttempt.data.error.code, 'PAYMENT_REQUEST_FORBIDDEN')
  assert.equal(outsiderAttempt.status, 403)
  assert.equal(outsiderAttempt.data.error.code, 'PAYMENT_REQUEST_FORBIDDEN')

  const partialPayment = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-pay-partial-001', body: { amount: '20.00' },
  })
  assert.equal(partialPayment.status, 400)
  assert.equal(partialPayment.data.error.code, 'PAYMENT_BODY_NOT_ALLOWED')

  const payKey = 'payment-pay-concurrent-001'
  const [firstPay, retryPay] = await Promise.all([
    request(`/api/payment-requests/${paymentRequestId}/pay`, {
      method: 'POST', token: payer.data.token, idempotencyKey: payKey, body: {},
    }),
    request(`/api/payment-requests/${paymentRequestId}/pay`, {
      method: 'POST', token: payer.data.token, idempotencyKey: payKey, body: {},
    }),
  ])
  assert.equal(firstPay.status, 200)
  assert.equal(retryPay.status, 200)
  assert.deepEqual(retryPay.data, firstPay.data)
  assert.equal(firstPay.data.paymentRequest.status, 'PAID')
  assert.equal(firstPay.data.paymentRequest.paidTransactionId, firstPay.data.transaction.id)

  const requesterWallet = await request('/api/wallet', { token: requester.data.token })
  const payerWallet = await request('/api/wallet', { token: payer.data.token })
  assert.deepEqual(requesterWallet.data.balances, { PEN: 25 })
  assert.deepEqual(payerWallet.data.balances, { PEN: 75 })

  const reusedPayload = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: payKey, body: { amount: '20.00' },
  })
  assert.equal(reusedPayload.status, 409)
  assert.equal(reusedPayload.data.error.code, 'IDEMPOTENCY_KEY_REUSED')

  const secondPayment = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-pay-second-001', body: {},
  })
  assert.equal(secondPayment.status, 409)
  assert.equal(secondPayment.data.error.code, 'PAYMENT_REQUEST_NOT_PENDING')

  const cancelPaid = await request(`/api/payment-requests/${paymentRequestId}/cancel`, {
    method: 'POST', token: requester.data.token,
  })
  assert.equal(cancelPaid.status, 409)
  assert.equal(cancelPaid.data.error.code, 'PAYMENT_REQUEST_NOT_PENDING')

  const createdPaid = await request('/api/payment-requests/created?status=PAID', { token: requester.data.token })
  assert.deepEqual(createdPaid.data.paymentRequests.map((item) => item.id), [paymentRequestId])
  const payerActivity = await request('/api/activity', { token: payer.data.token })
  assert.ok(payerActivity.data.activity.some((item) => item.type === 'PAYMENT_REQUEST_PAYMENT' && item.currency === 'PEN' && item.amount === -25))
  assert.equal(payerActivity.data.activity.some((item) => item.currency === 'USDT'), false)

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  const stored = auditDb.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentRequestId)
  const transactionCount = auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count
  const entries = auditDb.prepare('SELECT currency, amount FROM ledger_entries WHERE transaction_id = ?').all(stored.paid_transaction_id)
  const invalidPaid = auditDb.prepare(`SELECT COUNT(*) AS count FROM payment_requests WHERE status = 'PAID' AND paid_transaction_id IS NULL`).get().count
  const invalidTemporalPaid = auditDb.prepare(`SELECT COUNT(*) AS count FROM payment_requests WHERE status = 'PAID' AND expires_at <= paid_at`).get().count
  const failedAttemptRecords = auditDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE idempotency_key IN ('payment-pay-unverified-001', 'payment-pay-requester-001', 'payment-pay-outsider-001', 'payment-pay-partial-001', 'payment-pay-second-001')`).get().count
  auditDb.close()
  assert.equal(stored.status, 'PAID')
  assert.equal(stored.paid_transaction_id, firstPay.data.transaction.id)
  assert.equal(transactionCount, 1)
  assert.equal(entries.length, 2)
  assert.equal(entries.reduce((sum, entry) => sum + entry.amount, 0), 0)
  assert.ok(entries.every((entry) => entry.currency === 'PEN'))
  assert.equal(invalidPaid, 0)
  assert.equal(invalidTemporalPaid, 0)
  assert.equal(failedAttemptRecords, 0)
})

test('fondos insuficientes, cancelación y expiración lazy preservan saldos y estados terminales', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-payment-request-states-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const requester = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Requester States', phone: '+51973000001', alias: 'requester.states', password: 'ClaveSegura123' },
  })
  const payer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Payer States', phone: '+51973000002', alias: 'payer.states', password: 'ClaveSegura123' },
  })
  const outsider = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Outsider States', phone: '+51973000003', alias: 'outsider.states', password: 'ClaveSegura123' },
  })
  for (const user of [payer, outsider]) {
    await request('/api/demo/verify', { method: 'POST', token: user.data.token })
  }

  const cancellable = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-states-create-001',
    body: { payerAlias: 'payer.states', amount: '40.00', currency: 'PEN' },
  })
  const cancellableId = cancellable.data.paymentRequest.id
  const insufficientKey = 'payment-states-insufficient-001'
  const insufficient = await request(`/api/payment-requests/${cancellableId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: insufficientKey, body: {},
  })
  assert.equal(insufficient.status, 409)
  assert.equal(insufficient.data.error.code, 'INSUFFICIENT_FUNDS')

  const payerCancel = await request(`/api/payment-requests/${cancellableId}/cancel`, {
    method: 'POST', token: payer.data.token,
  })
  const outsiderCancel = await request(`/api/payment-requests/${cancellableId}/cancel`, {
    method: 'POST', token: outsider.data.token,
  })
  assert.equal(payerCancel.status, 403)
  assert.equal(outsiderCancel.status, 403)

  const cancelled = await request(`/api/payment-requests/${cancellableId}/cancel`, {
    method: 'POST', token: requester.data.token,
  })
  assert.equal(cancelled.status, 200)
  assert.equal(cancelled.data.paymentRequest.status, 'CANCELLED')
  assert.equal(cancelled.data.paymentRequest.paidTransactionId, null)

  const payCancelled = await request(`/api/payment-requests/${cancellableId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-states-cancelled-pay-001', body: {},
  })
  assert.equal(payCancelled.status, 409)
  assert.equal(payCancelled.data.error.code, 'PAYMENT_REQUEST_NOT_PENDING')

  const cancelAgain = await request(`/api/payment-requests/${cancellableId}/cancel`, {
    method: 'POST', token: requester.data.token,
  })
  assert.equal(cancelAgain.status, 409)
  assert.equal(cancelAgain.data.error.code, 'PAYMENT_REQUEST_NOT_PENDING')

  const expiring = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-states-expire-001',
    body: { payerAlias: 'payer.states', amount: '10.00', currency: 'PEN', expiresInDays: 1 },
  })
  const expiringId = expiring.data.paymentRequest.id
  const expiryDb = new DatabaseSync(dbPath)
  expiryDb.prepare(`UPDATE payment_requests SET expires_at = '2000-01-01T00:00:00.000Z' WHERE id = ?`).run(expiringId)
  expiryDb.close()

  const payExpired = await request(`/api/payment-requests/${expiringId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-states-expired-pay-001', body: {},
  })
  assert.equal(payExpired.status, 409)
  assert.equal(payExpired.data.error.code, 'PAYMENT_REQUEST_EXPIRED')
  const pendingReceived = await request('/api/payment-requests/received?status=PENDING', { token: payer.data.token })
  const expiredReceived = await request('/api/payment-requests/received?status=EXPIRED', { token: payer.data.token })
  assert.equal(pendingReceived.data.paymentRequests.some((item) => item.id === expiringId), false)
  assert.equal(expiredReceived.data.paymentRequests.some((item) => item.id === expiringId), true)
  const cancelExpired = await request(`/api/payment-requests/${expiringId}/cancel`, {
    method: 'POST', token: requester.data.token,
  })
  assert.equal(cancelExpired.status, 409)
  assert.equal(cancelExpired.data.error.code, 'PAYMENT_REQUEST_EXPIRED')

  const requesterWallet = await request('/api/wallet', { token: requester.data.token })
  const payerWallet = await request('/api/wallet', { token: payer.data.token })
  assert.deepEqual(requesterWallet.data.balances, { PEN: 0 })
  assert.deepEqual(payerWallet.data.balances, { PEN: 0 })

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  const storedCancelled = auditDb.prepare('SELECT * FROM payment_requests WHERE id = ?').get(cancellableId)
  const storedExpired = auditDb.prepare('SELECT * FROM payment_requests WHERE id = ?').get(expiringId)
  const paymentTransactions = auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count
  const insufficientRecords = auditDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(payer.data.user.id, insufficientKey).count
  auditDb.close()
  assert.equal(storedCancelled.status, 'CANCELLED')
  assert.equal(storedCancelled.paid_transaction_id, null)
  assert.equal(storedExpired.status, 'EXPIRED')
  assert.equal(storedExpired.paid_transaction_id, null)
  assert.equal(paymentTransactions, 0)
  assert.equal(insufficientRecords, 0)
})

test('fallos entre ledger, estado e idempotencia revierten completamente el pago', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-payment-request-rollback-'))
  const dbPath = join(directory, 'ionpay.db')
  const { app, request } = await startApi({ dbPath })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const requester = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Requester Rollback', phone: '+51974000001', alias: 'requester.rollback', password: 'ClaveSegura123' },
  })
  const payer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Payer Rollback', phone: '+51974000002', alias: 'payer.rollback', password: 'ClaveSegura123' },
  })
  await request('/api/demo/verify', { method: 'POST', token: payer.data.token })
  await request('/api/demo/fund', {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-rollback-fund-001', body: { amount: '100.00' },
  })

  const updateFailureRequest = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-rollback-create-a-001',
    body: { payerAlias: 'payer.rollback', amount: '10.00', currency: 'PEN' },
  })
  const idempotencyFailureRequest = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-rollback-create-b-001',
    body: { payerAlias: 'payer.rollback', amount: '10.00', currency: 'PEN' },
  })
  const updateFailureId = updateFailureRequest.data.paymentRequest.id
  const idempotencyFailureId = idempotencyFailureRequest.data.paymentRequest.id

  const triggerUpdateDb = new DatabaseSync(dbPath)
  triggerUpdateDb.exec(`
    CREATE TRIGGER force_payment_request_update_failure
    BEFORE UPDATE OF status ON payment_requests
    WHEN OLD.id = '${updateFailureId}' AND NEW.status = 'PAID'
    BEGIN
      SELECT RAISE(ABORT, 'forced payment request update failure');
    END;
  `)
  triggerUpdateDb.close()

  const updateFailureKey = 'payment-rollback-update-001'
  const updateFailure = await withoutConsoleError(() => request(`/api/payment-requests/${updateFailureId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: updateFailureKey, body: {},
  }))
  assert.equal(updateFailure.status, 500)
  assert.equal(updateFailure.data.error.code, 'INTERNAL_ERROR')

  const afterUpdateFailureDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(afterUpdateFailureDb.prepare('SELECT status FROM payment_requests WHERE id = ?').get(updateFailureId).status, 'PENDING')
  assert.equal(afterUpdateFailureDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count, 0)
  assert.equal(afterUpdateFailureDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(payer.data.user.id, updateFailureKey).count, 0)
  afterUpdateFailureDb.close()
  const payerAfterUpdateFailure = await request('/api/wallet', { token: payer.data.token })
  const requesterAfterUpdateFailure = await request('/api/wallet', { token: requester.data.token })
  assert.deepEqual(payerAfterUpdateFailure.data.balances, { PEN: 100 })
  assert.deepEqual(requesterAfterUpdateFailure.data.balances, { PEN: 0 })

  const dropUpdateTriggerDb = new DatabaseSync(dbPath)
  dropUpdateTriggerDb.exec('DROP TRIGGER force_payment_request_update_failure')
  dropUpdateTriggerDb.close()
  const updateRetry = await request(`/api/payment-requests/${updateFailureId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: updateFailureKey, body: {},
  })
  assert.equal(updateRetry.status, 200)

  const idempotencyFailureKey = 'payment-rollback-idem-001'
  const triggerIdempotencyDb = new DatabaseSync(dbPath)
  triggerIdempotencyDb.exec(`
    CREATE TRIGGER force_payment_request_idempotency_failure
    BEFORE INSERT ON idempotency_records
    WHEN NEW.idempotency_key = '${idempotencyFailureKey}'
    BEGIN
      SELECT RAISE(ABORT, 'forced payment request idempotency failure');
    END;
  `)
  triggerIdempotencyDb.close()

  const idempotencyFailure = await withoutConsoleError(() => request(`/api/payment-requests/${idempotencyFailureId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: idempotencyFailureKey, body: {},
  }))
  assert.equal(idempotencyFailure.status, 500)
  assert.equal(idempotencyFailure.data.error.code, 'INTERNAL_ERROR')

  const afterIdempotencyFailureDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(afterIdempotencyFailureDb.prepare('SELECT status FROM payment_requests WHERE id = ?').get(idempotencyFailureId).status, 'PENDING')
  assert.equal(afterIdempotencyFailureDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count, 1)
  assert.equal(afterIdempotencyFailureDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(payer.data.user.id, idempotencyFailureKey).count, 0)
  afterIdempotencyFailureDb.close()
  const payerAfterIdempotencyFailure = await request('/api/wallet', { token: payer.data.token })
  const requesterAfterIdempotencyFailure = await request('/api/wallet', { token: requester.data.token })
  assert.deepEqual(payerAfterIdempotencyFailure.data.balances, { PEN: 90 })
  assert.deepEqual(requesterAfterIdempotencyFailure.data.balances, { PEN: 10 })

  const dropIdempotencyTriggerDb = new DatabaseSync(dbPath)
  dropIdempotencyTriggerDb.exec('DROP TRIGGER force_payment_request_idempotency_failure')
  dropIdempotencyTriggerDb.close()
  const idempotencyRetry = await request(`/api/payment-requests/${idempotencyFailureId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: idempotencyFailureKey, body: {},
  })
  assert.equal(idempotencyRetry.status, 200)

  const payerFinal = await request('/api/wallet', { token: payer.data.token })
  const requesterFinal = await request('/api/wallet', { token: requester.data.token })
  assert.deepEqual(payerFinal.data.balances, { PEN: 80 })
  assert.deepEqual(requesterFinal.data.balances, { PEN: 20 })

  const finalDb = new DatabaseSync(dbPath, { readOnly: true })
  assert.equal(finalDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count, 2)
  assert.equal(finalDb.prepare(`SELECT COUNT(*) AS count FROM payment_requests WHERE status = 'PAID' AND paid_transaction_id IS NULL`).get().count, 0)
  finalDb.close()
})

test('pago que cruza expiración revierte ledger y persiste EXPIRED sin idempotencia', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-payment-request-expiry-pay-'))
  const dbPath = join(directory, 'ionpay.db')
  const beforeExpiry = new Date('2035-01-01T00:00:00.000Z')
  const afterExpiry = new Date('2035-01-01T00:00:02.000Z')
  let crossExpiry = false
  let clockCalls = 0
  const now = () => {
    if (!crossExpiry) return new Date(beforeExpiry)
    clockCalls += 1
    return new Date(clockCalls === 1 ? beforeExpiry : afterExpiry)
  }
  const { app, request } = await startApi({ dbPath, now })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const requester = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Requester Expiry Pay', phone: '+51975000001', alias: 'requester.expiry.pay', password: 'ClaveSegura123' },
  })
  const payer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Payer Expiry Pay', phone: '+51975000002', alias: 'payer.expiry.pay', password: 'ClaveSegura123' },
  })
  await request('/api/demo/verify', { method: 'POST', token: payer.data.token })
  await request('/api/demo/fund', {
    method: 'POST', token: payer.data.token, idempotencyKey: 'payment-expiry-pay-fund-001', body: { amount: '100.00' },
  })
  const created = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-expiry-pay-create-001',
    body: { payerAlias: 'payer.expiry.pay', amount: '25.00', currency: 'PEN' },
  })
  const paymentRequestId = created.data.paymentRequest.id
  const expiryDb = new DatabaseSync(dbPath)
  expiryDb.prepare(`UPDATE payment_requests SET expires_at = '2035-01-01T00:00:01.000Z' WHERE id = ?`).run(paymentRequestId)
  expiryDb.close()

  crossExpiry = true
  const paymentKey = 'payment-expiry-cross-pay-001'
  const payment = await request(`/api/payment-requests/${paymentRequestId}/pay`, {
    method: 'POST', token: payer.data.token, idempotencyKey: paymentKey, body: {},
  })
  assert.equal(payment.status, 409)
  assert.equal(payment.data.error.code, 'PAYMENT_REQUEST_EXPIRED')

  const payerWallet = await request('/api/wallet', { token: payer.data.token })
  const requesterWallet = await request('/api/wallet', { token: requester.data.token })
  assert.deepEqual(payerWallet.data.balances, { PEN: 100 })
  assert.deepEqual(requesterWallet.data.balances, { PEN: 0 })

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  const stored = auditDb.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentRequestId)
  const paymentTransactions = auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count
  const idempotencyRecords = auditDb.prepare(`SELECT COUNT(*) AS count FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?`).get(payer.data.user.id, paymentKey).count
  const missingTransaction = auditDb.prepare(`SELECT COUNT(*) AS count FROM payment_requests WHERE status = 'PAID' AND paid_transaction_id IS NULL`).get().count
  const invalidPaidTime = auditDb.prepare(`SELECT COUNT(*) AS count FROM payment_requests WHERE status = 'PAID' AND expires_at <= paid_at`).get().count
  auditDb.close()
  assert.equal(stored.status, 'EXPIRED')
  assert.equal(stored.paid_transaction_id, null)
  assert.equal(paymentTransactions, 0)
  assert.equal(idempotencyRecords, 0)
  assert.equal(missingTransaction, 0)
  assert.equal(invalidPaidTime, 0)
})

test('cancelación que cruza expiración conserva EXPIRED y no mueve saldo', async (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'ionpay-payment-request-expiry-cancel-'))
  const dbPath = join(directory, 'ionpay.db')
  const beforeExpiry = new Date('2036-01-01T00:00:00.000Z')
  const afterExpiry = new Date('2036-01-01T00:00:02.000Z')
  let crossExpiry = false
  let clockCalls = 0
  const now = () => {
    if (!crossExpiry) return new Date(beforeExpiry)
    clockCalls += 1
    return new Date(clockCalls === 1 ? beforeExpiry : afterExpiry)
  }
  const { app, request } = await startApi({ dbPath, now })
  context.after(async () => {
    await app.close()
    rmSync(directory, { recursive: true, force: true })
  })

  const requester = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Requester Expiry Cancel', phone: '+51976000001', alias: 'requester.expiry.cancel', password: 'ClaveSegura123' },
  })
  const payer = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Payer Expiry Cancel', phone: '+51976000002', alias: 'payer.expiry.cancel', password: 'ClaveSegura123' },
  })
  const created = await request('/api/payment-requests', {
    method: 'POST', token: requester.data.token, idempotencyKey: 'payment-expiry-cancel-create-001',
    body: { payerAlias: 'payer.expiry.cancel', amount: '25.00', currency: 'PEN' },
  })
  const paymentRequestId = created.data.paymentRequest.id
  const expiryDb = new DatabaseSync(dbPath)
  expiryDb.prepare(`UPDATE payment_requests SET expires_at = '2036-01-01T00:00:01.000Z' WHERE id = ?`).run(paymentRequestId)
  expiryDb.close()

  crossExpiry = true
  const cancellation = await request(`/api/payment-requests/${paymentRequestId}/cancel`, {
    method: 'POST', token: requester.data.token,
  })
  assert.equal(cancellation.status, 409)
  assert.equal(cancellation.data.error.code, 'PAYMENT_REQUEST_EXPIRED')

  const requesterWallet = await request('/api/wallet', { token: requester.data.token })
  const payerWallet = await request('/api/wallet', { token: payer.data.token })
  assert.deepEqual(requesterWallet.data.balances, { PEN: 0 })
  assert.deepEqual(payerWallet.data.balances, { PEN: 0 })

  const auditDb = new DatabaseSync(dbPath, { readOnly: true })
  const stored = auditDb.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentRequestId)
  const paymentTransactions = auditDb.prepare(`SELECT COUNT(*) AS count FROM ledger_transactions WHERE type = 'PAYMENT_REQUEST_PAYMENT'`).get().count
  auditDb.close()
  assert.equal(stored.status, 'EXPIRED')
  assert.equal(stored.cancelled_at, null)
  assert.notEqual(stored.expired_at, null)
  assert.equal(paymentTransactions, 0)
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

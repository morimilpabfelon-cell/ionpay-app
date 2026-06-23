import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createIonPayServer } from '../app.mjs'
import { createDatabase } from '../db.mjs'
import { createLedger, LedgerError } from '../ledger.mjs'
import { MoneyError, parsePenMinor } from '../money.mjs'

async function startApi() {
  const app = createIonPayServer({ dbPath: ':memory:', demoMode: true })
  const address = await app.listen(0)
  const baseUrl = `http://127.0.0.1:${address.port}`

  async function request(path, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: response.status, data: await response.json() }
  }

  return { app, request }
}

test('flujo financiero: registro, KYC, fondeo, envío y conversión', async (context) => {
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

  const funding = await request('/api/demo/fund', { method: 'POST', token: alice.data.token, body: { amount: '1000.00' } })
  assert.equal(funding.status, 201)
  assert.deepEqual(funding.data.balances, { PEN: 1000, USDT: 0 })

  const transfer = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, body: { recipientAlias: '@bob.ion', amount: '125.50', note: 'Prueba' },
  })
  assert.equal(transfer.status, 201)
  assert.equal(transfer.data.transaction.status, 'COMPLETED')
  assert.deepEqual(transfer.data.balances, { PEN: 874.5, USDT: 0 })

  const bobWallet = await request('/api/wallet', { token: bob.data.token })
  assert.deepEqual(bobWallet.data.balances, { PEN: 125.5, USDT: 0 })

  const insufficient = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, body: { recipientAlias: 'bob.ion', amount: '5000.00' },
  })
  assert.equal(insufficient.status, 409)
  assert.equal(insufficient.data.error.code, 'INSUFFICIENT_FUNDS')

  const conversion = await request('/api/conversions', {
    method: 'POST', token: alice.data.token, body: { fromCurrency: 'PEN', amount: '375.00' },
  })
  assert.equal(conversion.status, 201)
  assert.equal(conversion.data.received, 100)
  assert.deepEqual(conversion.data.balances, { PEN: 499.5, USDT: 100 })

  const activity = await request('/api/activity', { token: alice.data.token })
  assert.equal(activity.status, 200)
  assert.ok(activity.data.activity.some((item) => item.type === 'TRANSFER' && item.amount === -125.5))
  assert.ok(activity.data.activity.some((item) => item.type === 'CONVERSION' && item.currency === 'USDT' && item.amount === 100))
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
    method: 'POST', token: alice.data.token, body: { recipientAlias: 'alice.test', amount: '1.00' },
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
  for (const amount of invalidAmounts) {
    const result = await request('/api/transfers', {
      method: 'POST', token: alice.data.token, body: { recipientAlias: 'bob.test', amount },
    })
    assert.equal(result.status, 400, `El monto ${JSON.stringify(amount)} debe ser rechazado.`)
    assert.equal(result.data.error.code, 'INVALID_AMOUNT')
  }
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
})

test('fondeo demo y conversiones rechazan montos inválidos o demasiado pequeños', async (context) => {
  const { app, request } = await startApi()
  context.after(() => app.close())

  const user = await request('/api/auth/register', {
    method: 'POST',
    body: { name: 'Money Test', phone: '+51966666666', alias: 'money.test', password: 'ClaveSegura123' },
  })
  await request('/api/demo/verify', { method: 'POST', token: user.data.token })

  const invalidFunding = await request('/api/demo/fund', {
    method: 'POST', token: user.data.token, body: { amount: '1.001' },
  })
  assert.equal(invalidFunding.status, 400)
  assert.equal(invalidFunding.data.error.code, 'INVALID_AMOUNT')

  const invalidConversion = await request('/api/conversions', {
    method: 'POST', token: user.data.token, body: { fromCurrency: 'PEN', amount: '1.001' },
  })
  assert.equal(invalidConversion.status, 400)
  assert.equal(invalidConversion.data.error.code, 'INVALID_AMOUNT')

  const tooSmallConversion = await request('/api/conversions', {
    method: 'POST', token: user.data.token, body: { fromCurrency: 'PEN', amount: '0.01' },
  })
  assert.equal(tooSmallConversion.status, 400)
  assert.equal(tooSmallConversion.data.error.code, 'INVALID_AMOUNT')
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

import test from 'node:test'
import assert from 'node:assert/strict'
import { createIonPayServer } from '../app.mjs'

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
    method: 'POST', token: alice.data.token, body: { recipientAlias: 'bob.ion', amount: 10 },
  })
  assert.equal(blockedTransfer.status, 403)
  assert.equal(blockedTransfer.data.error.code, 'KYC_REQUIRED')

  const verifyAlice = await request('/api/demo/verify', { method: 'POST', token: alice.data.token })
  const verifyBob = await request('/api/demo/verify', { method: 'POST', token: bob.data.token })
  assert.equal(verifyAlice.data.user.kycStatus, 'VERIFIED')
  assert.equal(verifyBob.data.user.kycStatus, 'VERIFIED')

  const funding = await request('/api/demo/fund', { method: 'POST', token: alice.data.token, body: { amount: 1000 } })
  assert.equal(funding.status, 201)
  assert.deepEqual(funding.data.balances, { PEN: 1000, USDT: 0 })

  const transfer = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, body: { recipientAlias: '@bob.ion', amount: 125.5, note: 'Prueba' },
  })
  assert.equal(transfer.status, 201)
  assert.equal(transfer.data.transaction.status, 'COMPLETED')
  assert.deepEqual(transfer.data.balances, { PEN: 874.5, USDT: 0 })

  const bobWallet = await request('/api/wallet', { token: bob.data.token })
  assert.deepEqual(bobWallet.data.balances, { PEN: 125.5, USDT: 0 })

  const insufficient = await request('/api/transfers', {
    method: 'POST', token: alice.data.token, body: { recipientAlias: 'bob.ion', amount: 5000 },
  })
  assert.equal(insufficient.status, 409)
  assert.equal(insufficient.data.error.code, 'INSUFFICIENT_FUNDS')

  const conversion = await request('/api/conversions', {
    method: 'POST', token: alice.data.token, body: { fromCurrency: 'PEN', amount: 375 },
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

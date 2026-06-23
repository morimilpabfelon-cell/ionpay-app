import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { createDatabase } from './db.mjs'
import { createLedger, LedgerError } from './ledger.mjs'
import { MoneyError, multiplyDivideMinor, parseDecimalMinor, parsePenMinor } from './money.mjs'
import { hashPassword, hashToken, newSessionToken, verifyPassword } from './security.mjs'

class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const CONVERSIONS_AVAILABLE_IN_V1 = false

function send(response, status, data) {
  response.writeHead(status, jsonHeaders)
  response.end(JSON.stringify(data))
}

async function readBody(request) {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 1_000_000) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'La solicitud es demasiado grande.')
  }
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { throw new ApiError(400, 'INVALID_JSON', 'El cuerpo debe contener JSON válido.') }
}

function requiredText(value, name, minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum) throw new ApiError(400, 'VALIDATION_ERROR', `${name} no es válido.`)
  return value.trim()
}

function publicUser(user) {
  return { id: user.id, name: user.name, phone: user.phone, alias: user.alias, kycStatus: user.kyc_status, createdAt: user.created_at }
}

function reference() {
  return `ION-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`
}

export function createIonPayServer({ dbPath = 'data/ionpay.db', demoMode = true } = {}) {
  const db = createDatabase(dbPath)
  const ledger = createLedger(db)
  const findUserByPhone = db.prepare('SELECT * FROM users WHERE phone = ?')
  const findUserByAlias = db.prepare('SELECT * FROM users WHERE alias = ?')
  const findUserById = db.prepare('SELECT * FROM users WHERE id = ?')
  const insertUser = db.prepare('INSERT INTO users (id, name, phone, alias, password_hash, password_salt, kyc_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const insertAccount = db.prepare(`INSERT INTO accounts (id, owner_type, owner_id, currency, kind, balance, created_at) VALUES (?, 'USER', ?, ?, 'AVAILABLE', 0, ?)`)
  const findAccount = db.prepare(`SELECT * FROM accounts WHERE owner_type = ? AND owner_id = ? AND currency = ? AND kind = ?`)
  const insertSession = db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
  const findSession = db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?`)

  function createSession(userId) {
    const token = newSessionToken()
    const now = new Date()
    const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7)
    insertSession.run(hashToken(token), userId, expires.toISOString(), now.toISOString())
    return { token, expiresAt: expires.toISOString() }
  }

  function authenticate(request) {
    const authorization = request.headers.authorization ?? ''
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.')
    const user = findSession.get(hashToken(token), new Date().toISOString())
    if (!user) throw new ApiError(401, 'INVALID_SESSION', 'La sesión no es válida o expiró.')
    return user
  }

  function requireVerified(user) {
    if (user.kyc_status !== 'VERIFIED') throw new ApiError(403, 'KYC_REQUIRED', 'Completa la verificación de identidad para operar.')
  }

  function walletFor(userId) {
    const rows = db.prepare(`SELECT currency, balance FROM accounts WHERE owner_type = 'USER' AND owner_id = ? AND currency = 'PEN' AND kind = 'AVAILABLE'`).all(userId)
    return Object.fromEntries(rows.map((row) => [row.currency, row.balance / 100]))
  }

  const handler = async (request, response) => {
    if (request.method === 'OPTIONS') return send(response, 204, {})
    const url = new URL(request.url, 'http://localhost')

    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        return send(response, 200, { ok: true, service: 'ionpay-api', time: new Date().toISOString() })
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/register') {
        const body = await readBody(request)
        const name = requiredText(body.name, 'Nombre', 2)
        const phone = requiredText(body.phone, 'Teléfono', 7)
        const alias = requiredText(body.alias, 'Alias', 3).toLowerCase().replace(/^@/, '')
        const password = requiredText(body.password, 'Contraseña', 8)
        if (!/^[a-z0-9._-]{3,30}$/.test(alias)) throw new ApiError(400, 'INVALID_ALIAS', 'El alias solo puede usar letras, números, punto, guion y guion bajo.')
        if (findUserByPhone.get(phone) || findUserByAlias.get(alias)) throw new ApiError(409, 'USER_EXISTS', 'El teléfono o alias ya está registrado.')

        const id = randomUUID()
        const now = new Date().toISOString()
        const passwordData = hashPassword(password)
        db.exec('BEGIN IMMEDIATE')
        try {
          insertUser.run(id, name, phone, alias, passwordData.hash, passwordData.salt, 'PENDING', now)
          insertAccount.run(randomUUID(), id, 'PEN', now)
          insertAccount.run(randomUUID(), id, 'USDT', now)
          db.exec('COMMIT')
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }
        const session = createSession(id)
        return send(response, 201, { user: publicUser(findUserById.get(id)), ...session })
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readBody(request)
        const phone = requiredText(body.phone, 'Teléfono', 7)
        const password = requiredText(body.password, 'Contraseña', 8)
        const user = findUserByPhone.get(phone)
        if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Teléfono o contraseña incorrectos.')
        return send(response, 200, { user: publicUser(user), ...createSession(user.id) })
      }

      if (request.method === 'GET' && url.pathname === '/api/me') {
        return send(response, 200, { user: publicUser(authenticate(request)) })
      }

      if (request.method === 'GET' && url.pathname === '/api/wallet') {
        const user = authenticate(request)
        return send(response, 200, { balances: walletFor(user.id) })
      }

      if (request.method === 'GET' && url.pathname === '/api/activity') {
        const user = authenticate(request)
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)))
        const rows = db.prepare(`
          SELECT t.*, e.currency, e.amount
          FROM ledger_transactions t
          JOIN ledger_entries e ON e.transaction_id = t.id
          JOIN accounts a ON a.id = e.account_id
          WHERE a.owner_type = 'USER' AND a.owner_id = ?
            AND t.type != 'CONVERSION'
            AND e.currency = 'PEN'
          ORDER BY t.created_at DESC
          LIMIT ?
        `).all(user.id, limit)
        const activity = rows.map((row) => ({ id: row.id, reference: row.reference, type: row.type, status: row.status, currency: row.currency, amount: row.amount / 100, metadata: JSON.parse(row.metadata_json), createdAt: row.created_at }))
        return send(response, 200, { activity })
      }

      if (request.method === 'POST' && url.pathname === '/api/transfers') {
        const user = authenticate(request)
        requireVerified(user)
        const body = await readBody(request)
        const recipientAlias = requiredText(body.recipientAlias, 'Destinatario', 3).toLowerCase().replace(/^@/, '')
        const recipient = findUserByAlias.get(recipientAlias)
        if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'No encontramos al destinatario.')
        if (recipient.id === user.id) throw new ApiError(400, 'SAME_ACCOUNT', 'No puedes enviarte dinero a ti mismo.')
        const amount = parsePenMinor(body.amount)
        const senderAccount = findAccount.get('USER', user.id, 'PEN', 'AVAILABLE')
        const recipientAccount = findAccount.get('USER', recipient.id, 'PEN', 'AVAILABLE')
        const transaction = ledger.post({ type: 'TRANSFER', reference: reference(), entries: [{ accountId: senderAccount.id, currency: 'PEN', amount: -amount }, { accountId: recipientAccount.id, currency: 'PEN', amount }], metadata: { senderAlias: user.alias, recipientAlias: recipient.alias, note: typeof body.note === 'string' ? body.note.slice(0, 120) : '' } })
        return send(response, 201, { transaction, balances: walletFor(user.id) })
      }

      if (request.method === 'POST' && url.pathname === '/api/conversions') {
        const user = authenticate(request)
        if (!CONVERSIONS_AVAILABLE_IN_V1) throw new ApiError(409, 'FEATURE_NOT_AVAILABLE', 'La conversión no está disponible en esta versión.')
        requireVerified(user)
        const body = await readBody(request)
        const from = body.fromCurrency
        if (!['PEN', 'USDT'].includes(from)) throw new ApiError(400, 'INVALID_CURRENCY', 'La moneda de origen no es válida.')
        const rate = '3.75'
        const sourceAmount = parseDecimalMinor(body.amount, from)
        const to = from === 'PEN' ? 'USDT' : 'PEN'
        const targetAmount = from === 'PEN'
          ? multiplyDivideMinor(sourceAmount, 100, 375)
          : multiplyDivideMinor(sourceAmount, 375, 100)
        const sourceAccount = findAccount.get('USER', user.id, from, 'AVAILABLE')
        const targetAccount = findAccount.get('USER', user.id, to, 'AVAILABLE')
        const sourceTreasury = findAccount.get('SYSTEM', 'IONPAY', from, 'TREASURY')
        const targetTreasury = findAccount.get('SYSTEM', 'IONPAY', to, 'TREASURY')
        const transaction = ledger.post({ type: 'CONVERSION', reference: reference(), entries: [{ accountId: sourceAccount.id, currency: from, amount: -sourceAmount }, { accountId: sourceTreasury.id, currency: from, amount: sourceAmount }, { accountId: targetTreasury.id, currency: to, amount: -targetAmount }, { accountId: targetAccount.id, currency: to, amount: targetAmount }], metadata: { from, to, rate } })
        return send(response, 201, { transaction, received: targetAmount / 100, receivedCurrency: to, balances: walletFor(user.id) })
      }

      if (demoMode && request.method === 'POST' && url.pathname === '/api/demo/verify') {
        const user = authenticate(request)
        db.prepare(`UPDATE users SET kyc_status = 'VERIFIED' WHERE id = ?`).run(user.id)
        return send(response, 200, { user: publicUser(findUserById.get(user.id)) })
      }

      if (demoMode && request.method === 'POST' && url.pathname === '/api/demo/fund') {
        const user = authenticate(request)
        const body = await readBody(request)
        const amount = parsePenMinor(body.amount)
        const treasury = findAccount.get('SYSTEM', 'IONPAY', 'PEN', 'TREASURY')
        const userAccount = findAccount.get('USER', user.id, 'PEN', 'AVAILABLE')
        const transaction = ledger.post({ type: 'DEMO_FUNDING', reference: reference(), entries: [{ accountId: treasury.id, currency: 'PEN', amount: -amount }, { accountId: userAccount.id, currency: 'PEN', amount }], metadata: { demo: true } })
        return send(response, 201, { transaction, balances: walletFor(user.id) })
      }

      throw new ApiError(404, 'NOT_FOUND', 'Ruta no encontrada.')
    } catch (error) {
      if (error instanceof ApiError) return send(response, error.status, { error: { code: error.code, message: error.message } })
      if (error instanceof MoneyError) return send(response, 400, { error: { code: error.code, message: error.message } })
      if (error instanceof LedgerError) {
        const status = error.code === 'INSUFFICIENT_FUNDS' ? 409 : 400
        return send(response, status, { error: { code: error.code, message: error.message } })
      }
      console.error(error)
      return send(response, 500, { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' } })
    }
  }

  const server = createServer(handler)
  return {
    server,
    listen(port = 8787, host = '127.0.0.1') {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => resolve(server.address()))
      })
    },
    close() {
      return new Promise((resolve) => server.close(() => { db.close(); resolve() }))
    },
  }
}

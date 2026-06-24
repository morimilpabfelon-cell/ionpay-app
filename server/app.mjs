import { createServer } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const CONVERSIONS_AVAILABLE_IN_V1 = false
const PAYMENT_REQUEST_STATUSES = new Set(['PENDING', 'PAID', 'CANCELLED', 'EXPIRED'])

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

function paymentRequestReference() {
  return `IPR-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
}

function requireIdempotencyKey(request) {
  const key = request.headers['idempotency-key']
  if (key === undefined) throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'La operación requiere Idempotency-Key.')
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    throw new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key no es válida.')
  }
  return key
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function requestFingerprint(endpoint, payload) {
  return createHash('sha256').update(stableJson({ endpoint, payload })).digest('hex')
}

export function createIonPayServer({ dbPath = 'data/ionpay.db', demoMode = true, now = () => new Date() } = {}) {
  const db = createDatabase(dbPath)
  const ledger = createLedger(db)
  const findUserByPhone = db.prepare('SELECT * FROM users WHERE phone = ?')
  const findUserByAlias = db.prepare('SELECT * FROM users WHERE alias = ?')
  const findUserById = db.prepare('SELECT * FROM users WHERE id = ?')
  const insertUser = db.prepare('INSERT INTO users (id, name, phone, alias, password_hash, password_salt, kyc_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const insertAccount = db.prepare(`INSERT INTO accounts (id, owner_type, owner_id, currency, kind, balance, created_at) VALUES (?, 'USER', ?, ?, 'AVAILABLE', 0, ?)`)
  const findAccount = db.prepare(`SELECT * FROM accounts WHERE owner_type = ? AND owner_id = ? AND currency = ? AND kind = ?`)
  const listV1WalletAccounts = db.prepare(`
    SELECT a.*, COALESCE(SUM(e.amount), 0) AS ledger_balance
    FROM accounts a
    LEFT JOIN ledger_entries e ON e.account_id = a.id
    WHERE a.owner_type = 'USER' AND a.owner_id = ? AND a.currency = 'PEN' AND a.kind = 'AVAILABLE'
    GROUP BY a.id
  `)
  const insertSession = db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
  const findSession = db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?`)
  const findIdempotencyRecord = db.prepare('SELECT * FROM idempotency_records WHERE owner_id = ? AND idempotency_key = ?')
  const insertIdempotencyRecord = db.prepare(`
    INSERT INTO idempotency_records
      (id, owner_id, idempotency_key, endpoint, request_hash, status_code, response_json, transaction_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const paymentRequestProjection = `
    SELECT pr.*, requester.alias AS requester_alias, payer.alias AS payer_alias
    FROM payment_requests pr
    JOIN users requester ON requester.id = pr.requester_user_id
    JOIN users payer ON payer.id = pr.payer_user_id
  `
  const insertPaymentRequest = db.prepare(`
    INSERT INTO payment_requests
      (id, requester_user_id, payer_user_id, currency, amount, status, reference, metadata_json, created_at, updated_at, expires_at)
    VALUES (?, ?, ?, 'PEN', ?, 'PENDING', ?, ?, ?, ?, ?)
  `)
  const findPaymentRequestById = db.prepare(`${paymentRequestProjection} WHERE pr.id = ?`)
  const listReceivedPaymentRequests = db.prepare(`${paymentRequestProjection}
    WHERE pr.payer_user_id = ? AND (? IS NULL OR pr.status = ?)
    ORDER BY pr.created_at DESC
    LIMIT 100
  `)
  const listCreatedPaymentRequests = db.prepare(`${paymentRequestProjection}
    WHERE pr.requester_user_id = ? AND (? IS NULL OR pr.status = ?)
    ORDER BY pr.created_at DESC
    LIMIT 100
  `)
  const expirePendingPaymentRequests = db.prepare(`
    UPDATE payment_requests
    SET status = 'EXPIRED', updated_at = ?, expired_at = ?
    WHERE status = 'PENDING' AND expires_at <= ?
  `)
  const expirePaymentRequestById = db.prepare(`
    UPDATE payment_requests
    SET status = 'EXPIRED', updated_at = ?, expired_at = ?
    WHERE id = ? AND status = 'PENDING' AND expires_at <= ?
  `)
  const markPaymentRequestPaid = db.prepare(`
    UPDATE payment_requests
    SET status = 'PAID', updated_at = ?, paid_at = ?, paid_transaction_id = ?
    WHERE id = ? AND status = 'PENDING' AND expires_at > ?
  `)
  const cancelPaymentRequest = db.prepare(`
    UPDATE payment_requests
    SET status = 'CANCELLED', updated_at = ?, cancelled_at = ?
    WHERE id = ? AND status = 'PENDING' AND expires_at > ?
  `)

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

  function accountStatusFor(user) {
    if (user?.kyc_status === 'VERIFIED') return 'active'
    if (user?.kyc_status === 'PENDING') return 'pending_verification'
    if (user?.kyc_status === 'BLOCKED') return 'blocked'
    return 'error'
  }

  function walletStatusFor(userId) {
    const rows = listV1WalletAccounts.all(userId)
    if (rows.length === 0) return { status: 'missing', account: null }
    if (rows.length !== 1) return { status: 'invalid', account: null }
    const [account] = rows
    if (
      !Number.isSafeInteger(account.balance)
      || account.balance < 0
      || !Number.isSafeInteger(account.ledger_balance)
      || account.balance !== account.ledger_balance
    ) {
      return { status: 'invalid', account: null }
    }
    return { status: 'active', account }
  }

  function assertWalletOperable(userId) {
    const wallet = walletStatusFor(userId)
    if (wallet.status !== 'active') {
      throw new ApiError(409, 'WALLET_NOT_OPERABLE', 'La wallet PEN no está disponible para operar.')
    }
    return wallet.account
  }

  function assertAccountWalletOperable(user) {
    const accountStatus = accountStatusFor(user)
    if (accountStatus === 'pending_verification') {
      throw new ApiError(403, 'KYC_REQUIRED', 'Completa la verificación de identidad para operar.')
    }
    if (accountStatus === 'blocked') {
      throw new ApiError(403, 'ACCOUNT_BLOCKED', 'La cuenta está bloqueada y no puede operar.')
    }
    if (accountStatus !== 'active') {
      throw new ApiError(409, 'ACCOUNT_NOT_OPERABLE', 'La cuenta no está disponible para operar.')
    }
    return assertWalletOperable(user.id)
  }

  function walletFor(userId) {
    const account = assertWalletOperable(userId)
    return { PEN: account.balance / 100 }
  }

  function publicWallet(user) {
    const account = assertWalletOperable(user.id)
    const availableBalance = account.balance / 100
    return {
      balances: { PEN: availableBalance },
      account: { status: accountStatusFor(user) },
      wallet: {
        currency: 'PEN',
        status: 'active',
        availableBalance,
        heldBalance: 0,
      },
    }
  }

  function publicPaymentRequest(row) {
    const metadata = JSON.parse(row.metadata_json)
    return {
      id: row.id,
      reference: row.reference,
      requesterUserId: row.requester_user_id,
      requesterAlias: row.requester_alias,
      payerUserId: row.payer_user_id,
      payerAlias: row.payer_alias,
      currency: row.currency,
      amount: row.amount / 100,
      status: row.status,
      note: typeof metadata.note === 'string' ? metadata.note : '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      paidAt: row.paid_at,
      cancelledAt: row.cancelled_at,
      expiredAt: row.expired_at,
      paidTransactionId: row.paid_transaction_id,
    }
  }

  function paymentRequestStatusFilter(url) {
    const status = url.searchParams.get('status')
    if (status !== null && !PAYMENT_REQUEST_STATUSES.has(status)) {
      throw new ApiError(400, 'INVALID_PAYMENT_REQUEST_STATUS', 'El estado de solicitud no es válido.')
    }
    return status
  }

  function expireDuePaymentRequests() {
    const currentTime = now().toISOString()
    expirePendingPaymentRequests.run(currentTime, currentTime, currentTime)
  }

  function expirePaymentRequestWithinTransaction(id, currentTime) {
    return expirePaymentRequestById.run(currentTime, currentTime, id, currentTime)
  }

  function assertPaymentRequestPending(paymentRequest) {
    if (paymentRequest.status === 'EXPIRED') {
      throw new ApiError(409, 'PAYMENT_REQUEST_EXPIRED', 'La solicitud de pago expiró.')
    }
    if (paymentRequest.status !== 'PENDING') {
      throw new ApiError(409, 'PAYMENT_REQUEST_NOT_PENDING', 'La solicitud de pago ya no está pendiente.')
    }
  }

  function executeIdempotent({ ownerId, key, endpoint, payload, operation }) {
    const requestHash = requestFingerprint(endpoint, payload)
    db.exec('BEGIN IMMEDIATE')
    try {
      const existing = findIdempotencyRecord.get(ownerId, key)
      if (existing) {
        if (existing.endpoint !== endpoint || existing.request_hash !== requestHash) {
          throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key ya fue utilizada para otra operación.')
        }
        const replay = { status: existing.status_code, data: JSON.parse(existing.response_json) }
        db.exec('COMMIT')
        return replay
      }

      const result = operation()
      if (result.commitError) {
        db.exec('COMMIT')
        throw result.commitError
      }
      const recordedAt = new Date().toISOString()
      insertIdempotencyRecord.run(
        randomUUID(),
        ownerId,
        key,
        endpoint,
        requestHash,
        result.status,
        JSON.stringify(result.data),
        result.transactionId ?? null,
        recordedAt,
        recordedAt,
      )
      db.exec('COMMIT')
      return { status: result.status, data: result.data }
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK')
      throw error
    }
  }

  const handler = async (request, response) => {
    if (request.method === 'OPTIONS') return send(response, 204, {})
    const url = new URL(request.url, 'http://localhost')
    const paymentRequestPayMatch = url.pathname.match(/^\/api\/payment-requests\/([^/]+)\/pay$/)
    const paymentRequestCancelMatch = url.pathname.match(/^\/api\/payment-requests\/([^/]+)\/cancel$/)

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
        return send(response, 200, publicWallet(user))
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

      if (request.method === 'POST' && url.pathname === '/api/payment-requests') {
        const user = authenticate(request)
        const idempotencyKey = requireIdempotencyKey(request)
        const body = await readBody(request)
        const payerAlias = requiredText(body.payerAlias, 'Pagador', 3).toLowerCase().replace(/^@/, '')
        const currency = body.currency ?? 'PEN'
        if (currency !== 'PEN') throw new ApiError(400, 'INVALID_CURRENCY', 'Las solicitudes de pago solo admiten PEN.')
        const amount = parsePenMinor(body.amount)
        const note = typeof body.note === 'string' ? body.note.slice(0, 120) : ''
        const expiresInDays = body.expiresInDays ?? 7
        if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
          throw new ApiError(400, 'INVALID_EXPIRY', 'La expiración debe estar entre 1 y 30 días.')
        }

        const result = executeIdempotent({
          ownerId: user.id,
          key: idempotencyKey,
          endpoint: url.pathname,
          payload: { amount, currency, expiresInDays, note, payerAlias },
          operation: () => {
            const payer = findUserByAlias.get(payerAlias)
            if (!payer) throw new ApiError(404, 'PAYER_NOT_FOUND', 'No encontramos al pagador.')
            if (payer.id === user.id) throw new ApiError(400, 'SAME_ACCOUNT', 'No puedes solicitarte un pago a ti mismo.')
            const id = randomUUID()
            const createdAt = now().toISOString()
            const expiresAt = new Date(Date.parse(createdAt) + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            insertPaymentRequest.run(
              id,
              user.id,
              payer.id,
              amount,
              paymentRequestReference(),
              JSON.stringify({ note }),
              createdAt,
              createdAt,
              expiresAt,
            )
            return { status: 201, data: { paymentRequest: publicPaymentRequest(findPaymentRequestById.get(id)) } }
          },
        })
        return send(response, result.status, result.data)
      }

      if (request.method === 'GET' && url.pathname === '/api/payment-requests/received') {
        const user = authenticate(request)
        expireDuePaymentRequests()
        const status = paymentRequestStatusFilter(url)
        const rows = listReceivedPaymentRequests.all(user.id, status, status)
        return send(response, 200, { paymentRequests: rows.map(publicPaymentRequest) })
      }

      if (request.method === 'GET' && url.pathname === '/api/payment-requests/created') {
        const user = authenticate(request)
        expireDuePaymentRequests()
        const status = paymentRequestStatusFilter(url)
        const rows = listCreatedPaymentRequests.all(user.id, status, status)
        return send(response, 200, { paymentRequests: rows.map(publicPaymentRequest) })
      }

      if (request.method === 'POST' && paymentRequestPayMatch) {
        const user = authenticate(request)
        const idempotencyKey = requireIdempotencyKey(request)
        const body = await readBody(request)
        const paymentRequestId = paymentRequestPayMatch[1]

        const result = executeIdempotent({
          ownerId: user.id,
          key: idempotencyKey,
          endpoint: url.pathname,
          payload: { body, paymentRequestId },
          operation: () => {
            if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length > 0) {
              throw new ApiError(400, 'PAYMENT_BODY_NOT_ALLOWED', 'El pago usa el monto exacto de la solicitud.')
            }
            const paymentRequest = findPaymentRequestById.get(paymentRequestId)
            if (!paymentRequest) throw new ApiError(404, 'PAYMENT_REQUEST_NOT_FOUND', 'Solicitud de pago no encontrada.')
            const checkedAt = now().toISOString()
            if (paymentRequest.status === 'PENDING' && paymentRequest.expires_at <= checkedAt) {
              const expired = expirePaymentRequestWithinTransaction(paymentRequestId, checkedAt)
              if (expired.changes !== 1) throw new ApiError(409, 'PAYMENT_REQUEST_NOT_PENDING', 'La solicitud de pago ya no está pendiente.')
              return { commitError: new ApiError(409, 'PAYMENT_REQUEST_EXPIRED', 'La solicitud de pago expiró.') }
            }
            if (paymentRequest.payer_user_id !== user.id) {
              throw new ApiError(403, 'PAYMENT_REQUEST_FORBIDDEN', 'Solo el pagador asignado puede pagar esta solicitud.')
            }
            const currentPayer = findUserById.get(user.id)
            const payerAccount = assertAccountWalletOperable(currentPayer)
            assertPaymentRequestPending(paymentRequest)

            const requesterAccount = assertWalletOperable(paymentRequest.requester_user_id)
            const metadata = JSON.parse(paymentRequest.metadata_json)
            db.exec('SAVEPOINT payment_request_payment')
            const transaction = ledger.postWithinTransaction({
              type: 'PAYMENT_REQUEST_PAYMENT',
              reference: reference(),
              entries: [
                { accountId: payerAccount.id, currency: 'PEN', amount: -paymentRequest.amount },
                { accountId: requesterAccount.id, currency: 'PEN', amount: paymentRequest.amount },
              ],
              metadata: {
                paymentRequestId,
                requesterAlias: paymentRequest.requester_alias,
                payerAlias: paymentRequest.payer_alias,
                note: typeof metadata.note === 'string' ? metadata.note : '',
              },
            })
            const paidAt = now().toISOString()
            const update = markPaymentRequestPaid.run(paidAt, paidAt, transaction.id, paymentRequestId, paidAt)
            if (update.changes !== 1) {
              db.exec('ROLLBACK TO payment_request_payment')
              db.exec('RELEASE payment_request_payment')
              const expired = expirePaymentRequestWithinTransaction(paymentRequestId, paidAt)
              if (expired.changes === 1) {
                return { commitError: new ApiError(409, 'PAYMENT_REQUEST_EXPIRED', 'La solicitud de pago expiró.') }
              }
              throw new ApiError(409, 'PAYMENT_REQUEST_NOT_PENDING', 'La solicitud de pago ya no está pendiente.')
            }
            db.exec('RELEASE payment_request_payment')
            return {
              status: 200,
              data: {
                paymentRequest: publicPaymentRequest(findPaymentRequestById.get(paymentRequestId)),
                transaction,
                balances: walletFor(user.id),
              },
              transactionId: transaction.id,
            }
          },
        })
        return send(response, result.status, result.data)
      }

      if (request.method === 'POST' && paymentRequestCancelMatch) {
        const user = authenticate(request)
        const paymentRequestId = paymentRequestCancelMatch[1]
        db.exec('BEGIN IMMEDIATE')
        try {
          const paymentRequest = findPaymentRequestById.get(paymentRequestId)
          if (!paymentRequest) throw new ApiError(404, 'PAYMENT_REQUEST_NOT_FOUND', 'Solicitud de pago no encontrada.')
          if (paymentRequest.requester_user_id !== user.id) {
            throw new ApiError(403, 'PAYMENT_REQUEST_FORBIDDEN', 'Solo quien creó la solicitud puede cancelarla.')
          }
          const checkedAt = now().toISOString()
          if (paymentRequest.status === 'PENDING' && paymentRequest.expires_at <= checkedAt) {
            const expired = expirePaymentRequestWithinTransaction(paymentRequestId, checkedAt)
            if (expired.changes !== 1) throw new ApiError(409, 'PAYMENT_REQUEST_NOT_PENDING', 'La solicitud de pago ya no está pendiente.')
            db.exec('COMMIT')
            return send(response, 409, { error: { code: 'PAYMENT_REQUEST_EXPIRED', message: 'La solicitud de pago expiró.' } })
          }
          assertPaymentRequestPending(paymentRequest)
          const cancelledAt = now().toISOString()
          const update = cancelPaymentRequest.run(cancelledAt, cancelledAt, paymentRequestId, cancelledAt)
          if (update.changes !== 1) {
            const expired = expirePaymentRequestWithinTransaction(paymentRequestId, cancelledAt)
            if (expired.changes === 1) {
              db.exec('COMMIT')
              return send(response, 409, { error: { code: 'PAYMENT_REQUEST_EXPIRED', message: 'La solicitud de pago expiró.' } })
            }
            throw new ApiError(409, 'PAYMENT_REQUEST_NOT_PENDING', 'La solicitud de pago ya no está pendiente.')
          }
          const cancelled = publicPaymentRequest(findPaymentRequestById.get(paymentRequestId))
          db.exec('COMMIT')
          return send(response, 200, { paymentRequest: cancelled })
        } catch (error) {
          if (db.isTransaction) db.exec('ROLLBACK')
          throw error
        }
      }

      if (request.method === 'POST' && url.pathname === '/api/transfers') {
        const user = authenticate(request)
        assertAccountWalletOperable(user)
        const idempotencyKey = requireIdempotencyKey(request)
        const body = await readBody(request)
        const recipientAlias = requiredText(body.recipientAlias, 'Destinatario', 3).toLowerCase().replace(/^@/, '')
        const amount = parsePenMinor(body.amount)
        const note = typeof body.note === 'string' ? body.note.slice(0, 120) : ''
        const result = executeIdempotent({
          ownerId: user.id,
          key: idempotencyKey,
          endpoint: url.pathname,
          payload: { amount, note, recipientAlias },
          operation: () => {
            const recipient = findUserByAlias.get(recipientAlias)
            if (!recipient) throw new ApiError(404, 'RECIPIENT_NOT_FOUND', 'No encontramos al destinatario.')
            if (recipient.id === user.id) throw new ApiError(400, 'SAME_ACCOUNT', 'No puedes enviarte dinero a ti mismo.')
            const senderAccount = assertAccountWalletOperable(findUserById.get(user.id))
            const recipientAccount = assertWalletOperable(recipient.id)
            const transaction = ledger.postWithinTransaction({ type: 'TRANSFER', reference: reference(), entries: [{ accountId: senderAccount.id, currency: 'PEN', amount: -amount }, { accountId: recipientAccount.id, currency: 'PEN', amount }], metadata: { senderAlias: user.alias, recipientAlias: recipient.alias, note } })
            return { status: 201, data: { transaction, balances: walletFor(user.id) }, transactionId: transaction.id }
          },
        })
        return send(response, result.status, result.data)
      }

      if (request.method === 'POST' && url.pathname === '/api/conversions') {
        const user = authenticate(request)
        if (!CONVERSIONS_AVAILABLE_IN_V1) throw new ApiError(409, 'FEATURE_NOT_AVAILABLE', 'La conversión no está disponible en esta versión.')
        assertAccountWalletOperable(user)
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
        assertAccountWalletOperable(user)
        const idempotencyKey = requireIdempotencyKey(request)
        const body = await readBody(request)
        const amount = parsePenMinor(body.amount)
        const result = executeIdempotent({
          ownerId: user.id,
          key: idempotencyKey,
          endpoint: url.pathname,
          payload: { amount },
          operation: () => {
            const treasury = findAccount.get('SYSTEM', 'IONPAY', 'PEN', 'TREASURY')
            const userAccount = assertAccountWalletOperable(findUserById.get(user.id))
            const transaction = ledger.postWithinTransaction({ type: 'DEMO_FUNDING', reference: reference(), entries: [{ accountId: treasury.id, currency: 'PEN', amount: -amount }, { accountId: userAccount.id, currency: 'PEN', amount }], metadata: { demo: true } })
            return { status: 201, data: { transaction, balances: walletFor(user.id) }, transactionId: transaction.id }
          },
        })
        return send(response, result.status, result.data)
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

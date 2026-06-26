import type { ApiError, Balance, Currency, PaymentRequest, PaymentRequestStatus, Session, Transaction, TransactionStatus, User } from '../types'

const API_URL = (import.meta.env.VITE_IONPAY_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')
const SESSION_KEY = 'ionpay-api-session-v1'

interface AuthResponse extends Session {
  user: User
}

interface ActivityItem {
  id: string
  reference: string
  type: 'TRANSFER' | 'PAYMENT_REQUEST_PAYMENT' | 'CONVERSION' | 'DEMO_FUNDING' | string
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | string
  currency: Currency
  amount: number
  metadata: Record<string, unknown>
  createdAt: string
}

interface ErrorResponse {
  error?: {
    code?: string
    message?: string
  }
}

interface ApiTransaction {
  id?: string
  reference?: string
  type?: string
  status?: string
}

export interface MoneyOperationResponse {
  transaction?: ApiTransaction
  balances?: Balance
  paymentRequest?: PaymentRequest
}

export class IonPayApiError extends Error implements ApiError {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'IonPayApiError'
    this.status = status
    this.code = code
  }
}

function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID()

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  throw new IonPayApiError(0, 'IDEMPOTENCY_UNAVAILABLE', 'No se pudo generar una clave segura de idempotencia.')
}

function normalizeAlias(alias: string) {
  return alias.trim().toLowerCase().replace(/^@/, '')
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    if (!session.token || !session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* session storage unavailable */ }
    return null
  }
}

function storeSession(session: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

async function request<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const session = authenticated ? readSession() : null
  if (authenticated && !session) {
    throw new IonPayApiError(401, 'SESSION_EXPIRED', 'Tu sesión expiró. Inicia sesión nuevamente.')
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new IonPayApiError(0, 'API_UNAVAILABLE', 'No pudimos conectar con la API de ionPAY. Verifica que el servidor esté encendido.')
  }

  const body = await response.json().catch(() => ({})) as T & ErrorResponse
  if (!response.ok) {
    const sessionExpired = authenticated && response.status === 401
    if (sessionExpired) clearSession()
    const code = sessionExpired ? 'SESSION_EXPIRED' : (body.error?.code || 'API_ERROR')
    const message = sessionExpired
      ? 'Tu sesión expiró. Inicia sesión nuevamente.'
      : (body.error?.message || 'No se pudo completar la solicitud.')
    throw new IonPayApiError(response.status, code, message)
  }
  if (body.error) {
    throw new IonPayApiError(
      response.status,
      body.error.code || 'API_ERROR',
      body.error.message || 'No se pudo completar la solicitud.',
    )
  }
  return body
}

function stringMetadata(value: unknown, fallback = '') {
  return typeof value === 'string' && value ? value : fallback
}

function mapActivityStatus(status: string): TransactionStatus {
  if (status === 'COMPLETED') return 'Completado'
  if (status === 'FAILED') return 'Fallido'
  return 'Pendiente'
}

function receiptUnavailableReason(item: ActivityItem) {
  if (item.currency !== 'PEN') return 'Recibo no disponible: moneda fuera de V1.'
  if (item.status !== 'COMPLETED') return 'Recibo no disponible: actividad sin confirmación completada.'
  if (!item.id) return 'Recibo no disponible: falta ID backend.'
  return undefined
}

function activityProof(item: ActivityItem) {
  const unavailableReason = receiptUnavailableReason(item)
  return {
    backendId: item.id,
    backendReference: item.reference,
    proofSource: 'api' as const,
    receiptAvailable: !unavailableReason,
    receiptUnavailableReason: unavailableReason,
  }
}

function mapActivity(items: ActivityItem[]): Transaction[] {
  const visibleItems = items.filter((item) => item.currency === 'PEN' && item.type !== 'CONVERSION')

  return visibleItems.map((item) => {
    const direction = item.amount < 0 ? 'out' : item.amount > 0 ? 'in' : 'neutral'
    const metadata = item.metadata || {}
    const recipientAlias = stringMetadata(metadata.recipientAlias, 'destinatario')
    const senderAlias = stringMetadata(metadata.senderAlias, 'remitente')
    const requesterAlias = stringMetadata(metadata.requesterAlias, 'solicitante')
    const payerAlias = stringMetadata(metadata.payerAlias, 'pagador')
    const status = mapActivityStatus(item.status)
    const proof = activityProof(item)

    if (item.type === 'PAYMENT_REQUEST_PAYMENT') {
      const outgoing = direction === 'out'
      return {
        id: item.reference,
        ...proof,
        kind: outgoing ? 'payment' : 'receive',
        title: outgoing ? 'Pago realizado' : 'Cobro recibido',
        counterpart: `@${outgoing ? requesterAlias : payerAlias}`,
        amount: Math.abs(item.amount),
        currency: 'PEN',
        direction,
        status,
        channel: 'IONPAY API',
        createdAt: item.createdAt,
        note: stringMetadata(metadata.note) || undefined,
      }
    }

    if (item.type === 'DEMO_FUNDING') {
      return {
        id: item.reference,
        ...proof,
        kind: 'receive',
        title: 'Saldo demo recibido',
        counterpart: 'Fondeo de demostración',
        amount: Math.abs(item.amount),
        currency: 'PEN',
        direction: 'in',
        status,
        channel: 'IONPAY API',
        createdAt: item.createdAt,
        note: stringMetadata(metadata.note) || undefined,
      }
    }

    return {
      id: item.reference,
      ...proof,
      kind: direction === 'out' ? 'send' : 'receive',
      title: direction === 'out' ? 'Dinero enviado' : 'Dinero recibido',
      counterpart: `@${direction === 'out' ? recipientAlias : senderAlias}`,
      amount: Math.abs(item.amount),
      currency: 'PEN',
      direction,
      status,
      channel: 'IONPAY API',
      createdAt: item.createdAt,
      note: stringMetadata(metadata.note) || undefined,
    }
  })
}

function paymentRequestPath(path: string, status?: PaymentRequestStatus) {
  return status ? `${path}?status=${encodeURIComponent(status)}` : path
}

export const api = {
  hasSession: () => Boolean(readSession()),
  clearSession,

  async register(input: { name: string; phone: string; alias: string; password: string }) {
    const response = await request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    storeSession({ token: response.token, expiresAt: response.expiresAt })
    return response.user
  },

  async login(input: { phone: string; password: string }) {
    const response = await request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    storeSession({ token: response.token, expiresAt: response.expiresAt })
    return response.user
  },

  async getUser() {
    const response = await request<{ user: User }>('/api/me', {}, true)
    return response.user
  },

  async getBalances() {
    const response = await request<{ balances: Balance }>('/api/wallet', {}, true)
    return response.balances
  },

  async getActivity(limit = 50) {
    const response = await request<{ activity: ActivityItem[] }>(`/api/activity?limit=${limit}`, {}, true)
    return mapActivity(response.activity)
  },

  createIdempotencyKey,

  async createTransfer(input: { recipientAlias: string; amount: string; note?: string }, idempotencyKey: string) {
    return request<MoneyOperationResponse>('/api/transfers', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        recipientAlias: normalizeAlias(input.recipientAlias),
        amount: input.amount,
        note: input.note?.trim() || '',
      }),
    }, true)
  },

  async createPaymentRequest(input: { payerAlias: string; amount: string; note?: string; expiresInDays?: number }, idempotencyKey: string) {
    return request<{ paymentRequest: PaymentRequest }>('/api/payment-requests', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        payerAlias: normalizeAlias(input.payerAlias),
        currency: 'PEN',
        amount: input.amount,
        note: input.note?.trim() || '',
        expiresInDays: input.expiresInDays ?? 7,
      }),
    }, true)
  },

  async getReceivedPaymentRequests(status?: PaymentRequestStatus) {
    const response = await request<{ paymentRequests: PaymentRequest[] }>(paymentRequestPath('/api/payment-requests/received', status), {}, true)
    return response.paymentRequests
  },

  async getCreatedPaymentRequests(status?: PaymentRequestStatus) {
    const response = await request<{ paymentRequests: PaymentRequest[] }>(paymentRequestPath('/api/payment-requests/created', status), {}, true)
    return response.paymentRequests
  },

  async payPaymentRequest(id: string, idempotencyKey: string) {
    return request<MoneyOperationResponse>(`/api/payment-requests/${encodeURIComponent(id)}/pay`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({}),
    }, true)
  },

  async cancelPaymentRequest(id: string) {
    return request<{ paymentRequest: PaymentRequest }>(`/api/payment-requests/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, true)
  },
}

import type { ApiError, Balance, Currency, Session, Transaction, User } from '../types'

const API_URL = (import.meta.env.VITE_IONPAY_API_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')
const SESSION_KEY = 'ionpay-api-session-v1'

interface AuthResponse extends Session {
  user: User
}

interface ActivityItem {
  id: string
  reference: string
  type: 'TRANSFER' | 'CONVERSION' | 'DEMO_FUNDING' | string
  status: 'COMPLETED' | 'PENDING' | string
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
  return body
}

function mapActivity(items: ActivityItem[]): Transaction[] {
  const visibleItems = items.filter((item) => item.type !== 'CONVERSION' || item.amount > 0)
  return visibleItems.map((item) => {
    const direction = item.type === 'CONVERSION' ? 'neutral' : item.amount < 0 ? 'out' : 'in'
    const metadata = item.metadata || {}
    const counterpart = item.type === 'CONVERSION'
      ? `${String(metadata.from || '')} → ${String(metadata.to || '')}`
      : direction === 'out'
        ? `@${String(metadata.recipientAlias || 'destinatario')}`
        : item.type === 'DEMO_FUNDING'
          ? 'Fondeo de demostración'
          : `@${String(metadata.senderAlias || 'remitente')}`

    return {
      id: item.reference,
      kind: item.type === 'CONVERSION' ? 'conversion' : item.type === 'DEMO_FUNDING' ? 'receive' : direction === 'out' ? 'send' : 'receive',
      title: item.type === 'CONVERSION' ? 'Conversión completada' : item.type === 'DEMO_FUNDING' ? 'Saldo demo recibido' : direction === 'out' ? 'Dinero enviado' : 'Dinero recibido',
      counterpart,
      amount: Math.abs(item.amount),
      currency: item.currency,
      direction,
      status: item.status === 'COMPLETED' ? 'Completado' : 'Pendiente',
      channel: item.type === 'CONVERSION' ? 'Ion Convert' : 'IONPAY API',
      createdAt: item.createdAt,
      note: typeof metadata.note === 'string' && metadata.note ? metadata.note : undefined,
    }
  })
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
}

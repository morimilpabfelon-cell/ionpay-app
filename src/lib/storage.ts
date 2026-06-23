import type { IonState, Transaction } from '../types'

const STORAGE_KEY = 'ionpay-demo-v1'

const now = Date.now()

export const demoTransactions: Transaction[] = [
  {
    id: 'ION-8F2A19',
    kind: 'receive',
    title: 'Dinero recibido',
    counterpart: 'María C.',
    amount: 520,
    currency: 'PEN',
    direction: 'in',
    status: 'Completado',
    channel: 'IONPAY',
    createdAt: new Date(now - 1000 * 60 * 52).toISOString(),
    note: 'Pago del proyecto',
  },
  {
    id: 'ION-3C71B4',
    kind: 'payment',
    title: 'Pago realizado',
    counterpart: 'Café Central',
    amount: 24.9,
    currency: 'PEN',
    direction: 'out',
    status: 'Completado',
    channel: 'Ion QR',
    createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
  },
]

export const emptyState: IonState = {
  user: null,
  wallet: { pen: 0, usdt: 0 },
  transactions: [],
}

export const demoState: IonState = {
  user: {
    name: 'Alex Rivera',
    phone: '+51 999 888 777',
    alias: 'alex.ion',
    kycStatus: 'Verificado',
  },
  wallet: { pen: 2840.6, usdt: 0 },
  transactions: demoTransactions,
}

export function loadState(): IonState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as IonState) : emptyState
  } catch {
    return emptyState
  }
}

export function saveState(state: IonState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearState() {
  localStorage.removeItem(STORAGE_KEY)
}

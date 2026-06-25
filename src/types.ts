export type Currency = 'PEN' | 'USDT'
export type V1Currency = 'PEN'
export type TransactionKind = 'receive' | 'send' | 'payment' | 'conversion'
export type TransactionStatus = 'Completado' | 'Pendiente' | 'En revisión'

export type ApiKycStatus = 'PENDING' | 'VERIFIED'
export type PaymentRequestStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'

export interface User {
  id: string
  name: string
  phone: string
  alias: string
  kycStatus: ApiKycStatus
  createdAt: string
}

export interface Session {
  token: string
  expiresAt: string
}

export interface Balance {
  PEN: number
  USDT?: number
}

export interface ApiError {
  status: number
  code: string
  message: string
}

export interface IonUser {
  name: string
  phone: string
  alias: string
  kycStatus: 'Pendiente' | 'Verificado'
}

export interface Wallet {
  pen: number
  usdt: number
}

export interface Transaction {
  id: string
  kind: TransactionKind
  title: string
  counterpart: string
  amount: number
  currency: Currency
  direction: 'in' | 'out' | 'neutral'
  status: TransactionStatus
  channel: string
  createdAt: string
  note?: string
}

export interface PaymentRequest {
  id: string
  reference: string
  requesterUserId: string
  requesterAlias: string
  payerUserId: string
  payerAlias: string
  currency: V1Currency
  amount: number
  status: PaymentRequestStatus
  note: string
  createdAt: string
  updatedAt: string
  expiresAt: string
  paidAt: string | null
  cancelledAt: string | null
  expiredAt: string | null
  paidTransactionId: string | null
}

export interface IonState {
  user: IonUser | null
  wallet: Wallet
  transactions: Transaction[]
}

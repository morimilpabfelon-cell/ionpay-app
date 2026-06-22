export type Currency = 'PEN' | 'USDT'
export type TransactionKind = 'receive' | 'send' | 'payment' | 'conversion'
export type TransactionStatus = 'Completado' | 'Pendiente' | 'En revisión'

export type ApiKycStatus = 'PENDING' | 'VERIFIED'

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
  USDT: number
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

export interface IonState {
  user: IonUser | null
  wallet: Wallet
  transactions: Transaction[]
}

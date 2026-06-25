import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BellIcon,
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  ConvertIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GridIcon,
  HomeIcon,
  LogoutIcon,
  PayIcon,
  ReceiveIcon,
  SearchIcon,
  SendIcon,
  ShieldIcon,
  UserIcon,
} from './components/Icons'
import Onboarding from './components/Onboarding'
import ServicesPage from './components/ServicesPage'
import { api, IonPayApiError, type MoneyOperationResponse } from './lib/api'
import { clearState, demoState, loadState, saveState } from './lib/storage'
import type { Currency, IonState, IonUser, PaymentRequest, Transaction, TransactionKind, User } from './types'

type Tab = 'home' | 'activity' | 'services' | 'profile'
type Action = 'send' | 'receive' | 'pay' | null
type AppMode = 'checking' | 'signed-out' | 'api' | 'demo'
type PaymentRequestState = { received: PaymentRequest[]; created: PaymentRequest[] }
type ToastState = { message: string; variant: 'success' | 'error' } | null

const emptyPaymentRequests: PaymentRequestState = { received: [], created: [] }

const QR_BITS = '111111101010111111110100001001010100000110111010111011101101011101010101110110101110111011101101011101000101010100010001111111101010111111110000000101010000000010101011101110101010101110100011010001110010011011101101010110101000111001011110010111010011101000101110101011100011001010001000101111111101011101001011000001010100101001011111110100111001010110000101011100110101000001111111101010101111111'.split('')

function money(amount: number, currency: Currency) {
  return currency === 'PEN'
    ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)
    : `${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
}

function shortDate(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return `Hoy, ${date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function makeId() {
  return `ION-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
}

function v1Transactions(transactions: Transaction[]) {
  return transactions.filter((item) => item.currency === 'PEN' && item.kind !== 'conversion')
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof IonPayApiError ? cause.message : fallback
}

function validAmount(value: string) {
  const trimmed = value.trim()
  return /^[0-9]+(?:\.[0-9]{1,2})?$/.test(trimmed) && Number(trimmed) > 0
}

function confirmedTransaction(transactions: Transaction[], response: MoneyOperationResponse) {
  const reference = response.transaction?.reference
  if (!reference) return null
  return transactions.find((transaction) => transaction.id === reference) ?? null
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`} aria-label="ionPAY">
      {compact ? <span className="brand-mini">i<span>PAY</span></span> : <><span className="brand-ion">ion</span><span className="brand-pay">PAY</span></>}
    </div>
  )
}

function Sidebar({ tab, setTab, mode }: { tab: Tab; setTab: (tab: Tab) => void; mode: 'demo' | 'api' }) {
  const items: Array<[Tab, string, typeof HomeIcon]> = [
    ['home', 'Inicio', HomeIcon],
    ['activity', 'Actividad', ActivityIcon],
    ['services', 'Cobros', GridIcon],
    ['profile', 'Perfil', UserIcon],
  ]

  return (
    <aside className="sidebar">
      <Logo />
      <nav>{items.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon />{label}</button>)}</nav>
      <div className="sidebar-help"><span>?</span><div><strong>¿Necesitas ayuda?</strong><small>Visita Ion Guide</small></div></div>
      <div className="demo-pill"><i /> {mode === 'demo' ? 'Demo local' : 'API local'}</div>
    </aside>
  )
}

function MobileNav({ tab, setTab, onPay }: { tab: Tab; setTab: (tab: Tab) => void; onPay: () => void }) {
  return <nav className="mobile-nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><HomeIcon /><span>Inicio</span></button><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}><ActivityIcon /><span>Actividad</span></button><button className="nav-pay" onClick={onPay}><span className="nav-pay-circle"><PayIcon /></span><span>Pagar</span></button><button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}><GridIcon /><span>Cobros</span></button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><UserIcon /><span>Perfil</span></button></nav>
}

function BalanceCard({ state, visible, setVisible }: { state: IonState; visible: boolean; setVisible: (value: boolean) => void }) {
  return (
    <section className="balance-card">
      <div className="balance-top"><span>Saldo disponible</span><button onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar saldo' : 'Mostrar saldo'}>{visible ? <EyeIcon /> : <EyeOffIcon />}</button></div>
      <div className="main-balance">{visible ? money(state.wallet.pen, 'PEN') : 'S/ ••••••'}</div>
      <div className="balance-meta"><div><span>Wallet ionPAY V1</span><strong>Saldo fiat local</strong></div></div>
    </section>
  )
}

function TransactionIcon({ kind }: { kind: TransactionKind }) {
  if (kind === 'receive') return <span className="transaction-icon incoming"><ArrowDownIcon /></span>
  if (kind === 'conversion') return <span className="transaction-icon conversion"><ConvertIcon /></span>
  return <span className="transaction-icon outgoing"><ArrowUpIcon /></span>
}

function TransactionRow({ item, onOpen }: { item: Transaction; onOpen: () => void }) {
  const sign = item.direction === 'in' ? '+' : item.direction === 'out' ? '−' : ''
  return (
    <button className="transaction-row" onClick={onOpen}>
      <TransactionIcon kind={item.kind} />
      <span className="transaction-main"><strong>{item.counterpart}</strong><small>{item.title} · {shortDate(item.createdAt)}</small></span>
      <span className={`transaction-amount ${item.direction}`}><strong>{sign}{money(item.amount, item.currency)}</strong><small>{item.status}</small></span>
    </button>
  )
}

function EmptyActivity() {
  return <div className="empty-state"><ActivityIcon /><strong>Aún no hay movimientos</strong><span>Tus operaciones aparecerán aquí.</span></div>
}

function Home({ state, setAction, setTab, openReceipt }: { state: IonState; setAction: (action: Action) => void; setTab: (tab: Tab) => void; openReceipt: (item: Transaction) => void }) {
  const [visible, setVisible] = useState(true)
  const firstName = state.user!.name.split(' ')[0]
  const transactions = v1Transactions(state.transactions)
  const actions = [
    { id: 'send', label: 'Enviar', Icon: SendIcon, run: () => setAction('send') },
    { id: 'receive', label: 'Recibir', Icon: ReceiveIcon, run: () => setAction('receive') },
    { id: 'pay', label: 'Pagar', Icon: PayIcon, run: () => setAction('pay') },
    { id: 'activity', label: 'Actividad', Icon: ActivityIcon, run: () => setTab('activity') },
  ]

  return (
    <>
      <header className="topbar"><div><span className="mobile-brand"><Logo /></span><p>Hola, {firstName}</p><h1>Tu dinero, bajo control.</h1></div><button className="notification"><BellIcon /><i /></button></header>
      <div className="home-grid">
        <div>
          <BalanceCard state={state} visible={visible} setVisible={setVisible} />
          <section className="quick-actions" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>{actions.map(({ id, label, Icon, run }) => <button key={id} onClick={run}><span><Icon /></span><strong>{label}</strong></button>)}</section>
          <section className="section-card activity-preview"><div className="section-title"><div><span className="eyebrow">Movimientos</span><h2>Actividad reciente</h2></div><button onClick={() => setTab('activity')}>Ver todo <ChevronIcon /></button></div><div>{transactions.length ? transactions.slice(0, 4).map((item) => <TransactionRow key={item.id} item={item} onOpen={() => openReceipt(item)} />) : <EmptyActivity />}</div></section>
        </div>
        <aside className="home-aside"><section className="account-status"><div className="section-title compact"><div><span className="eyebrow">Tu cuenta</span><h2>Estado</h2></div><ShieldIcon /></div><div className="status-row"><span className={`status-dot ${state.user!.kycStatus === 'Verificado' ? 'verified' : ''}`}><CheckIcon /></span><div><strong>Identidad {state.user!.kycStatus === 'Verificado' ? 'verificada' : 'pendiente'}</strong><small>{state.user!.kycStatus === 'Verificado' ? 'Tu cuenta está lista para operar' : 'Verificación pendiente para futuras funciones'}</small></div></div><div className="notice-box"><strong>V1 enfocada en pagos internos</strong><p>Saldo fiat PEN, envíos, cobros, solicitudes de pago, historial y comprobantes confirmados.</p></div></section></aside>
      </div>
    </>
  )
}

function ActivityPage({ transactions, openReceipt }: { transactions: Transaction[]; openReceipt: (item: Transaction) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | Exclude<TransactionKind, 'conversion'>>('all')
  const visibleTransactions = useMemo(() => v1Transactions(transactions), [transactions])
  const filtered = useMemo(() => visibleTransactions.filter((item) => {
    const matchesFilter = filter === 'all' || item.kind === filter
    const term = query.toLowerCase()
    return matchesFilter && (`${item.counterpart} ${item.title} ${item.id}`).toLowerCase().includes(term)
  }), [visibleTransactions, query, filter])

  return (
    <section className="page-section">
      <div className="page-heading"><span className="eyebrow">Ion Activity</span><h1>Tu actividad</h1><p>Consulta, filtra y verifica cada movimiento V1 confirmado por backend.</p></div>
      <div className="activity-tools"><label className="search-box"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar movimiento" /></label><div className="filter-chips">{([['all', 'Todos'], ['receive', 'Recibidos'], ['send', 'Enviados'], ['payment', 'Pagos']] as const).map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
      <div className="section-card full-list">{filtered.length ? filtered.map((item) => <TransactionRow key={item.id} item={item} onOpen={() => openReceipt(item)} />) : <EmptyActivity />}</div>
    </section>
  )
}

function ProfilePage({ user, onReset, logoutLabel }: { user: IonUser; onReset: () => void; logoutLabel: string }) {
  return (
    <section className="page-section profile-page">
      <header className="profile-screen-header"><span /><h1>Perfil</h1><span /></header>
      <div className="profile-identity"><div className="avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><h2>{user.name}</h2><span><ShieldIcon /> Cuenta {user.kycStatus === 'Verificado' ? 'verificada' : 'pendiente'}</span></div></div>
      <section className="profile-info-card"><div><UserIcon /><span><small>IonTag</small><strong>@{user.alias}</strong></span></div><div><ShieldIcon /><span><small>Estado KYC</small><strong>{user.kycStatus}</strong></span></div></section>
      <span className="profile-section-label">Cuenta V1</span>
      <section className="profile-menu-card"><div className="profile-menu-row"><span className="profile-row-icon"><ActivityIcon /></span><span className="profile-row-copy"><strong>Historial</strong><small>Movimientos y comprobantes backend</small></span><span className="profile-row-value">Disponible</span><ChevronIcon /></div><div className="profile-menu-row"><span className="profile-row-icon"><ReceiveIcon /></span><span className="profile-row-copy"><strong>Cobros básicos</strong><small>Solicitudes de pago en PEN</small></span><span className="profile-row-value">V1</span><ChevronIcon /></div></section>
      <button className="profile-logout" onClick={onReset}><LogoutIcon /> {logoutLabel}</button>
    </section>
  )
}

interface ActionModalProps {
  action: Exclude<Action, null>
  state: IonState
  demoMode: boolean
  paymentRequests: PaymentRequestState
  processing: boolean
  processingRequestId: string | null
  onClose: () => void
  onDemoTransaction: (transaction: Transaction, penChange: number, usdtChange?: number) => void
  onApiTransfer: (input: { recipientAlias: string; amount: string; note?: string }) => Promise<void>
  onApiPaymentRequest: (input: { payerAlias: string; amount: string; note?: string }) => Promise<void>
  onApiPayRequest: (id: string) => Promise<void>
}

function ActionModal({ action, state, demoMode, paymentRequests, processing, processingRequestId, onClose, onDemoTransaction, onApiTransfer, onApiPaymentRequest, onApiPayRequest }: ActionModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const pendingReceived = paymentRequests.received.filter((request) => request.status === 'PENDING')
  const requestBusy = processing || Boolean(processingRequestId)

  const config = {
    send: { title: 'Enviar dinero', eyebrow: demoMode ? 'Modo demostración' : 'Transferencia IONPAY API', target: 'Destinatario', placeholder: '@usuario o celular', button: 'Confirmar envío' },
    pay: { title: 'Realizar un pago', eyebrow: demoMode ? 'Modo demostración' : 'Solicitudes por pagar', target: 'Comercio', placeholder: 'Nombre o código del comercio', button: 'Confirmar pago' },
    receive: { title: demoMode ? 'Recibir dinero' : 'Crear solicitud de pago', eyebrow: demoMode ? 'Tu cuenta IONPAY' : 'Cobro IONPAY API', target: 'Pagador', placeholder: '@usuario pagador', button: 'Crear solicitud' },
  }[action]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (processing) return
    setError('')

    if (action === 'pay' && !demoMode) return
    if (action === 'receive' && demoMode) return
    if (!validAmount(amount)) return setError('Ingresa un monto válido en PEN con máximo 2 decimales.')
    if ((action === 'send' || action === 'pay' || action === 'receive') && !name.trim()) return setError('Indica el usuario correspondiente.')
    if (demoMode && (action === 'send' || action === 'pay') && Number(amount) > state.wallet.pen) return setError('No tienes saldo suficiente en soles.')

    try {
      if (demoMode) {
        const kind = action === 'pay' ? 'payment' : 'send'
        onDemoTransaction({ id: makeId(), kind, title: action === 'pay' ? 'Pago realizado' : 'Dinero enviado', counterpart: name.trim(), amount: Number(amount), currency: 'PEN', direction: 'out', status: 'Completado', channel: action === 'pay' ? 'Ion Pay Demo' : 'IONPAY Demo', createdAt: new Date().toISOString(), note: note.trim() || undefined }, -Number(amount))
        return
      }

      if (action === 'send') {
        await onApiTransfer({ recipientAlias: name, amount: amount.trim(), note })
      } else if (action === 'receive') {
        await onApiPaymentRequest({ payerAlias: name, amount: amount.trim(), note })
      }
    } catch (cause) {
      setError(errorMessage(cause, 'No se pudo completar la operación.'))
    }
  }

  const payRequest = async (id: string) => {
    if (processing || processingRequestId) return
    setError('')
    try {
      await onApiPayRequest(id)
    } catch (cause) {
      setError(errorMessage(cause, 'No se pudo pagar la solicitud.'))
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !requestBusy && onClose()}>
      <section className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} disabled={requestBusy}><CloseIcon /></button>
        <span className="eyebrow">{config.eyebrow}</span><h2>{config.title}</h2>
        {action === 'receive' && demoMode ? <ReceivePanel user={state.user!} /> : null}
        {action === 'pay' && !demoMode ? <div><div className="notice-box"><strong>Pagos confirmados por backend</strong><p>El saldo no se modifica localmente. Después de pagar se recargan wallet, actividad y solicitudes.</p></div><div className="full-list" style={{ padding: 0, marginTop: 14 }}>{pendingReceived.length ? pendingReceived.map((request) => <div className="transaction-row" key={request.id}><span className="transaction-icon outgoing"><PayIcon /></span><span className="transaction-main"><strong>@{request.requesterAlias}</strong><small>{request.note || request.reference} · vence {shortDate(request.expiresAt)}</small></span><span className="transaction-amount out"><strong>{money(request.amount, 'PEN')}</strong><small>{request.status}</small></span><button className="secondary-button" type="button" disabled={requestBusy} onClick={() => void payRequest(request.id)}>{processingRequestId === request.id ? 'Pagando...' : 'Pagar'}</button></div>) : <EmptyActivity />}</div>{error && <div className="form-error">{error}</div>}</div> : null}
        {action !== 'pay' || demoMode ? <form onSubmit={submit}>{!(action === 'receive' && demoMode) && <label className="field"><span>{config.target}</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={config.placeholder} autoFocus /></label>}{!(action === 'receive' && demoMode) && <label className="field amount-field"><span>Monto</span><div><b>S/</b><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" inputMode="decimal" /></div><small>Disponible: {money(state.wallet.pen, 'PEN')}</small></label>}{!(action === 'receive' && demoMode) && <label className="field"><span>Nota <i>(opcional)</i></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="¿Para qué es?" maxLength={120} /></label>}{error && <div className="form-error">{error}</div>}{!(action === 'receive' && demoMode) && <button className="primary-button" type="submit" disabled={processing}>{processing ? 'Procesando...' : config.button}</button>}<div className="safe-caption"><ShieldIcon /> {demoMode ? 'Simulación local: no mueve dinero real' : 'API local: backend es fuente de verdad, PEN-only'}</div></form> : null}
      </section>
    </div>
  )
}

function ReceivePanel({ user }: { user: IonUser }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(`@${user.alias}`) } catch { /* clipboard may be unavailable */ }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return <div className="receive-panel"><div className="qr-code">{QR_BITS.map((bit, index) => <i key={index} className={bit === '1' ? 'dark' : ''} />)}<span className="qr-logo"><Logo compact /></span></div><p>Comparte este código para recibir soles en tu cuenta.</p><button className="alias-copy" onClick={copy}><span><small>Tu IonTag</small><strong>@{user.alias}</strong></span>{copied ? <CheckIcon /> : <CopyIcon />}</button>{copied && <div className="copied-label">IonTag copiado</div>}</div>
}

function ReceiptModal({ item, onClose }: { item: Transaction; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal receipt"><button className="modal-close" onClick={onClose}><CloseIcon /></button><div className="success-mark"><CheckIcon /></div><span className="eyebrow">Ion Receipt</span><h2>{item.status}</h2><div className={`receipt-amount ${item.direction}`}>{item.direction === 'in' ? '+' : item.direction === 'out' ? '−' : ''}{money(item.amount, item.currency)}</div><div className="receipt-details"><div><span>Operación</span><strong>{item.title}</strong></div><div><span>Referencia</span><strong>{item.counterpart}</strong></div><div><span>Fecha</span><strong>{new Date(item.createdAt).toLocaleString('es-PE')}</strong></div><div><span>Canal</span><strong>{item.channel}</strong></div><div><span>Código</span><strong>{item.id}</strong></div></div><button className="secondary-button" onClick={onClose}>Cerrar comprobante</button></section></div>
}

function toIonUser(user: User): IonUser {
  return { name: user.name, phone: user.phone, alias: user.alias, kycStatus: user.kycStatus === 'VERIFIED' ? 'Verificado' : 'Pendiente' }
}

export default function App() {
  const [state, setState] = useState<IonState>({ user: null, wallet: { pen: 0, usdt: 0 }, transactions: [] })
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestState>(emptyPaymentRequests)
  const [mode, setMode] = useState<AppMode>('checking')
  const [connectionError, setConnectionError] = useState('')
  const [tab, setTab] = useState<Tab>('home')
  const [action, setAction] = useState<Action>(null)
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [processing, setProcessing] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
  const moneyOperationInFlight = useRef(false)

  const flash = (message: string, variant: 'success' | 'error' = 'success') => {
    setToast({ message, variant })
    window.setTimeout(() => setToast(null), 2600)
  }

  const beginMoneyOperation = () => {
    if (moneyOperationInFlight.current) return false
    moneyOperationInFlight.current = true
    return true
  }

  const endMoneyOperation = () => {
    moneyOperationInFlight.current = false
  }

  const loadApiState = async (knownUser?: User) => {
    const [user, balances, transactions, received, created] = await Promise.all([
      knownUser ? Promise.resolve(knownUser) : api.getUser(),
      api.getBalances(),
      api.getActivity(),
      api.getReceivedPaymentRequests(),
      api.getCreatedPaymentRequests(),
    ])
    const nextState: IonState = { user: toIonUser(user), wallet: { pen: balances.PEN ?? 0, usdt: 0 }, transactions }
    setState(nextState)
    setPaymentRequests({ received, created })
    setConnectionError('')
    setMode('api')
    return nextState
  }

  const restoreSession = async () => {
    if (!api.hasSession()) {
      setMode('signed-out')
      return
    }
    setMode('checking')
    try { await loadApiState() } catch (cause) { setConnectionError(errorMessage(cause, 'No se pudo recuperar tu sesión.')); setMode('signed-out') }
  }

  useEffect(() => { void restoreSession() }, [])
  useEffect(() => { if (mode === 'demo') saveState(state) }, [mode, state])

  const register = async (input: { name: string; phone: string; alias: string; password: string }) => {
    const user = await api.register(input)
    await loadApiState(user)
  }

  const login = async (input: { phone: string; password: string }) => {
    const user = await api.login(input)
    await loadApiState(user)
  }

  const loadDemo = () => {
    const savedDemo = loadState()
    setState(savedDemo.user ? savedDemo : structuredClone(demoState))
    setPaymentRequests(emptyPaymentRequests)
    setConnectionError('')
    moneyOperationInFlight.current = false
    setMode('demo')
  }

  const reset = () => {
    api.clearSession()
    if (mode === 'demo') clearState()
    setState({ user: null, wallet: { pen: 0, usdt: 0 }, transactions: [] })
    setPaymentRequests(emptyPaymentRequests)
    moneyOperationInFlight.current = false
    setProcessing(false)
    setProcessingRequestId(null)
    setMode('signed-out')
    setTab('home')
  }

  const addDemoTransaction = (transaction: Transaction, penChange: number, usdtChange = 0) => {
    if (mode !== 'demo') return
    setState((current) => ({ ...current, wallet: { pen: Math.max(0, current.wallet.pen + penChange), usdt: Math.max(0, current.wallet.usdt + usdtChange) }, transactions: [transaction, ...current.transactions] }))
    setAction(null)
    setReceipt(transaction)
    flash('Simulación completada')
  }

  const applyConfirmedMoneyOperation = async (operation: () => Promise<MoneyOperationResponse>, successMessage: string, requestId?: string) => {
    if (!beginMoneyOperation()) return
    setProcessing(true)
    if (requestId) setProcessingRequestId(requestId)
    try {
      const response = await operation()
      const nextState = await loadApiState()
      const confirmed = confirmedTransaction(nextState.transactions, response)
      setAction(null)
      if (confirmed) {
        setReceipt(confirmed)
        flash(successMessage)
      } else {
        flash('Backend confirmó la operación. Actividad recargada sin comprobante local.')
      }
    } finally {
      setProcessing(false)
      if (requestId) setProcessingRequestId(null)
      endMoneyOperation()
    }
  }

  const submitApiTransfer = async (input: { recipientAlias: string; amount: string; note?: string }) => {
    if (mode !== 'api') return
    await applyConfirmedMoneyOperation(() => {
      const idempotencyKey = api.createIdempotencyKey()
      return api.createTransfer(input, idempotencyKey)
    }, 'Transferencia confirmada')
  }

  const submitApiPaymentRequest = async (input: { payerAlias: string; amount: string; note?: string }) => {
    if (mode !== 'api') return
    if (!beginMoneyOperation()) return
    setProcessing(true)
    try {
      const idempotencyKey = api.createIdempotencyKey()
      await api.createPaymentRequest(input, idempotencyKey)
      await loadApiState()
      setAction(null)
      flash('Solicitud de pago creada')
    } finally {
      setProcessing(false)
      endMoneyOperation()
    }
  }

  const payPaymentRequest = async (id: string) => {
    if (mode !== 'api') return
    await applyConfirmedMoneyOperation(() => {
      const idempotencyKey = api.createIdempotencyKey()
      return api.payPaymentRequest(id, idempotencyKey)
    }, 'Pago confirmado', id)
  }

  const cancelPaymentRequest = async (id: string) => {
    if (mode !== 'api') return
    if (!beginMoneyOperation()) return
    setProcessing(true)
    setProcessingRequestId(id)
    try {
      await api.cancelPaymentRequest(id)
      await loadApiState()
      flash('Solicitud cancelada')
    } finally {
      setProcessingRequestId(null)
      setProcessing(false)
      endMoneyOperation()
    }
  }

  const cancelPaymentRequestFromServices = async (id: string) => {
    try { await cancelPaymentRequest(id) } catch (cause) { flash(errorMessage(cause, 'No se pudo cancelar la solicitud.'), 'error') }
  }

  const payPaymentRequestFromServices = async (id: string) => {
    try { await payPaymentRequest(id) } catch (cause) { flash(errorMessage(cause, 'No se pudo pagar la solicitud.'), 'error') }
  }

  if (mode === 'checking' || mode === 'signed-out' || !state.user) {
    return <Onboarding onRegister={register} onLogin={login} onDemo={loadDemo} checking={mode === 'checking'} connectionError={connectionError} onRetry={() => void restoreSession()} />
  }

  return (
    <div className="app-shell">
      <Sidebar tab={tab} setTab={setTab} mode={mode} />
      <main className="app-content">
        {mode === 'demo' && <div className="demo-caption">Modo demo · fondos simulados · no mueve dinero real</div>}
        {tab === 'home' && <Home state={state} setAction={setAction} setTab={setTab} openReceipt={setReceipt} />}
        {tab === 'activity' && <ActivityPage transactions={state.transactions} openReceipt={setReceipt} />}
        {tab === 'services' && <ServicesPage state={state} paymentRequests={paymentRequests} openAction={(next) => setAction(next)} onPayRequest={payPaymentRequestFromServices} onCancelRequest={cancelPaymentRequestFromServices} processingRequestId={processingRequestId} requestOperationPending={Boolean(processingRequestId)} />}
        {tab === 'profile' && <ProfilePage user={state.user} onReset={reset} logoutLabel={mode === 'demo' ? 'Salir y borrar datos demo' : 'Cerrar sesión'} />}
      </main>
      <MobileNav tab={tab} setTab={setTab} onPay={() => setAction('pay')} />
      {action && <ActionModal action={action} state={state} demoMode={mode === 'demo'} paymentRequests={paymentRequests} processing={processing} processingRequestId={processingRequestId} onClose={() => setAction(null)} onDemoTransaction={addDemoTransaction} onApiTransfer={submitApiTransfer} onApiPaymentRequest={submitApiPaymentRequest} onApiPayRequest={payPaymentRequest} />}
      {receipt && <ReceiptModal item={receipt} onClose={() => setReceipt(null)} />}
      {toast && <div className={`toast ${toast.variant}`} role={toast.variant === 'error' ? 'alert' : 'status'}>{toast.variant === 'success' && <CheckIcon />}{toast.message}</div>}
    </div>
  )
}

import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
  GlobeIcon,
  GridIcon,
  HelpIcon,
  HomeIcon,
  KeyIcon,
  LaptopIcon,
  LocationIcon,
  LockIcon,
  LogoutIcon,
  MoreIcon,
  PayIcon,
  PhoneIcon,
  ReceiveIcon,
  SearchIcon,
  SendIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
  DeviceIcon,
} from './components/Icons'
import Onboarding from './components/Onboarding'
import ServicesPage from './components/ServicesPage'
import { api, IonPayApiError } from './lib/api'
import { clearState, demoState, loadState, saveState } from './lib/storage'
import type { Currency, IonState, IonUser, Transaction, TransactionKind, User } from './types'

type Tab = 'home' | 'activity' | 'services' | 'profile'
type Action = 'send' | 'receive' | 'pay' | null

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
    ['services', 'Servicios', GridIcon],
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
  return <nav className="mobile-nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><HomeIcon /><span>Inicio</span></button><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}><ActivityIcon /><span>Actividad</span></button><button className="nav-pay" onClick={onPay}><span className="nav-pay-circle"><PayIcon /></span><span>Pagar</span></button><button className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}><GridIcon /><span>Servicios</span></button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><UserIcon /><span>Perfil</span></button></nav>
}

function BalanceCard({ state, visible, setVisible }: { state: IonState; visible: boolean; setVisible: (value: boolean) => void }) {
  return (
    <section className="balance-card">
      <div className="balance-top"><span>Saldo disponible</span><button onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar saldo' : 'Mostrar saldo'}>{visible ? <EyeIcon /> : <EyeOffIcon />}</button></div>
      <div className="main-balance">{visible ? money(state.wallet.pen, 'PEN') : 'S/ ••••••'}</div>
      <div className="balance-meta">
        <div><span>Wallet ionPAY V1</span><strong>Saldo fiat local</strong></div>
      </div>
      <div className="card-glow" />
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
      <header className="topbar">
        <div><span className="mobile-brand"><Logo /></span><p>Hola, {firstName}</p><h1>Tu dinero, bajo control.</h1></div>
        <button className="notification"><BellIcon /><i /></button>
      </header>
      <div className="home-grid">
        <div>
          <BalanceCard state={state} visible={visible} setVisible={setVisible} />
          <section className="quick-actions" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>{actions.map(({ id, label, Icon, run }) => <button key={id} onClick={run}><span><Icon /></span><strong>{label}</strong></button>)}</section>
          <section className="section-card activity-preview">
            <div className="section-title"><div><span className="eyebrow">Movimientos</span><h2>Actividad reciente</h2></div><button onClick={() => setTab('activity')}>Ver todo <ChevronIcon /></button></div>
            <div>{transactions.length ? transactions.slice(0, 4).map((item) => <TransactionRow key={item.id} item={item} onOpen={() => openReceipt(item)} />) : <EmptyActivity />}</div>
          </section>
        </div>
        <aside className="home-aside">
          <section className="account-status">
            <div className="section-title compact"><div><span className="eyebrow">Tu cuenta</span><h2>Estado</h2></div><MoreIcon /></div>
            <div className="status-row"><span className={`status-dot ${state.user!.kycStatus === 'Verificado' ? 'verified' : ''}`}><CheckIcon /></span><div><strong>Identidad {state.user!.kycStatus === 'Verificado' ? 'verificada' : 'pendiente'}</strong><small>{state.user!.kycStatus === 'Verificado' ? 'Tu cuenta está lista para operar' : 'Verificación pendiente para futuras funciones'}</small></div></div>
            <div className="notice-box"><strong>V1 enfocada en pagos internos</strong><p>Esta versión prioriza saldo fiat, envíos, cobros, pagos, historial y comprobantes.</p></div>
          </section>
        </aside>
      </div>
    </>
  )
}

function EmptyActivity() {
  return <div className="empty-state"><ActivityIcon /><strong>Aún no hay movimientos</strong><span>Tus operaciones aparecerán aquí.</span></div>
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
      <div className="page-heading"><span className="eyebrow">Ion Activity</span><h1>Tu actividad</h1><p>Consulta, filtra y verifica cada movimiento V1 de tu cuenta.</p></div>
      <div className="activity-tools">
        <label className="search-box"><SearchIcon /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar movimiento" /></label>
        <div className="filter-chips">{([['all', 'Todos'], ['receive', 'Recibidos'], ['send', 'Enviados'], ['payment', 'Pagos']] as const).map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
      </div>
      <div className="section-card full-list">{filtered.length ? filtered.map((item) => <TransactionRow key={item.id} item={item} onOpen={() => openReceipt(item)} />) : <EmptyActivity />}</div>
    </section>
  )
}

function ProfileRow({ Icon, title, detail, value, onClick }: { Icon: typeof HomeIcon; title: string; detail?: string; value?: string; onClick?: () => void }) {
  return <button className="profile-menu-row" onClick={onClick}><span className="profile-row-icon"><Icon /></span><span className="profile-row-copy"><strong>{title}</strong>{detail && <small>{detail}</small>}</span>{value && <span className="profile-row-value">{value}</span>}<ChevronIcon /></button>
}

function ScreenHeader({ title, back, settings }: { title: string; back?: () => void; settings?: () => void }) {
  return <header className="profile-screen-header">{back ? <button aria-label="Volver" onClick={back}>←</button> : <span />}<h1>{title}</h1>{settings ? <button aria-label="Ajustes" onClick={settings}><SettingsIcon /></button> : <span />}</header>
}

function ProfilePage({ user, onReset, logoutLabel }: { user: IonUser; onReset: () => void; logoutLabel: string }) {
  const [screen, setScreen] = useState<'profile' | 'settings' | 'devices'>('profile')
  const [trusted, setTrusted] = useState(true)
  const [biometric, setBiometric] = useState(true)
  const [alerts, setAlerts] = useState(true)
  const initials = user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  if (screen === 'settings') return <section className="page-section profile-page settings-screen"><div className="profile-logo"><Logo /></div><ScreenHeader title="Ajustes" back={() => setScreen('profile')} /><div className="settings-groups"><div><span className="profile-section-label">Cuenta</span><section className="profile-menu-card"><ProfileRow Icon={UserIcon} title="Información personal" detail="Consulta tus datos básicos" /><ProfileRow Icon={ShieldIcon} title="Estado de verificación" detail={user.kycStatus} /></section></div><div><span className="profile-section-label">Seguridad</span><section className="profile-menu-card"><ProfileRow Icon={LockIcon} title="Contraseña y biometría" detail="Administra tu acceso seguro" onClick={() => setScreen('devices')} /></section></div><div><span className="profile-section-label">Notificaciones</span><section className="profile-menu-card"><ProfileRow Icon={BellIcon} title="Preferencias de notificación" detail="Elige qué alertas quieres recibir" /></section></div><div><span className="profile-section-label">Idioma y región</span><section className="profile-menu-card"><ProfileRow Icon={GlobeIcon} title="Idioma" value="Español" /><ProfileRow Icon={LocationIcon} title="Región" value="Perú" /></section></div><div><span className="profile-section-label">Privacidad</span><section className="profile-menu-card"><ProfileRow Icon={ShieldIcon} title="Controles de privacidad" detail="Administra tus datos y permisos" /></section></div><div><span className="profile-section-label">Soporte</span><section className="profile-menu-card"><ProfileRow Icon={HelpIcon} title="Centro de ayuda" detail="Encuentra respuestas y soporte" /></section></div></div></section>

  if (screen === 'devices') return <section className="page-section profile-page devices-screen"><div className="profile-logo"><Logo /></div><ScreenHeader title="Dispositivos" back={() => setScreen('profile')} /><p className="screen-description">Administra los dispositivos que tienen acceso a tu cuenta.</p><span className="profile-section-label">Este dispositivo</span><section className="profile-menu-card device-card"><span className="device-icon"><DeviceIcon /></span><span><strong>Este Android</strong><small>IONPAY App · Lima, Perú</small></span><i>Activo ahora</i><ChevronIcon /></section><span className="profile-section-label">Otros dispositivos conectados</span><section className="profile-menu-card"><ProfileRow Icon={LaptopIcon} title="Chrome en Windows" detail="Lima, Perú" value="Hace 2 h" /><ProfileRow Icon={DeviceIcon} title="Samsung Galaxy S23" detail="Arequipa, Perú" value="Hace 1 d" /></section><span className="profile-section-label">Controles de seguridad</span><section className="profile-menu-card device-controls"><ToggleProfileRow Icon={ShieldIcon} title="Dispositivo confiable" detail="Reduce verificaciones en este equipo" value={trusted} setValue={setTrusted} /><ToggleProfileRow Icon={UserIcon} title="Acceso biométrico" detail="Usa huella o reconocimiento facial" value={biometric} setValue={setBiometric} /><ToggleProfileRow Icon={BellIcon} title="Alertas de sesión" detail="Avisa sobre nuevos accesos" value={alerts} setValue={setAlerts} /></section><button className="manage-sessions"><LockIcon /><span><strong>Administrar sesiones</strong><small>Revisa y cierra otros dispositivos</small></span><ChevronIcon /></button></section>

  return (
    <section className="page-section profile-page">
      <ScreenHeader title="Perfil" settings={() => setScreen('settings')} />
      <div className="profile-identity"><div className="avatar">{initials}</div><div><h2>{user.name}</h2><span><ShieldIcon /> Cuenta {user.kycStatus === 'Verificado' ? 'verificada' : 'pendiente'}</span></div></div>
      <section className="profile-info-card"><div><PhoneIcon /><span><small>Número de teléfono</small><strong>{user.phone}</strong></span></div><div><CopyIcon /><span><small>IonTag</small><strong>@{user.alias}</strong></span></div><div><ShieldIcon /><span><small>Estado KYC</small><strong>{user.kycStatus}</strong></span></div><div><GlobeIcon /><span><small>País</small><strong>Perú</strong></span></div></section>
      <span className="profile-section-label">Seguridad</span>
      <section className="profile-menu-card"><ProfileRow Icon={UserIcon} title="Biometría" value="Activa" onClick={() => setScreen('devices')} /><ProfileRow Icon={KeyIcon} title="Código de acceso" value="Activo" /><ProfileRow Icon={ShieldIcon} title="Autenticación en dos pasos" value="Activa" /><ProfileRow Icon={DeviceIcon} title="Administrar dispositivos" value="3 dispositivos" onClick={() => setScreen('devices')} /></section>
      <span className="profile-section-label">Cuenta V1</span>
      <section className="profile-menu-card"><ProfileRow Icon={ActivityIcon} title="Historial" detail="Movimientos y comprobantes" value="Disponible" /><ProfileRow Icon={ReceiveIcon} title="Cobros básicos" detail="Recibe por IonTag o QR" value="V1" /></section>
      <section className="profile-menu-card profile-help"><ProfileRow Icon={HelpIcon} title="Ayuda y soporte" /></section>
      <button className="profile-logout" onClick={onReset}><LogoutIcon /> {logoutLabel}</button>
    </section>
  )
}

function ToggleProfileRow({ Icon, title, detail, value, setValue }: { Icon: typeof HomeIcon; title: string; detail: string; value: boolean; setValue: (value: boolean) => void }) {
  return <div className="profile-toggle-row"><span className="profile-row-icon"><Icon /></span><span className="profile-row-copy"><strong>{title}</strong><small>{detail}</small></span><button className={`switch ${value ? 'on' : ''}`} aria-label={title} aria-pressed={value} onClick={() => setValue(!value)}><i /></button></div>
}

interface ActionModalProps {
  action: Exclude<Action, null>
  state: IonState
  demoMode: boolean
  onClose: () => void
  onTransaction: (transaction: Transaction, penChange: number, usdtChange?: number) => void
}

function ActionModal({ action, state, demoMode, onClose, onTransaction }: ActionModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const numeric = Number(amount)

  const config = {
    send: { title: 'Enviar dinero', eyebrow: 'Transferencia IONPAY', target: 'Destinatario', placeholder: '@usuario o celular', button: 'Confirmar envío' },
    pay: { title: 'Realizar un pago', eyebrow: 'Pago seguro', target: 'Comercio', placeholder: 'Nombre o código del comercio', button: 'Confirmar pago' },
    receive: { title: 'Recibir dinero', eyebrow: 'Tu cuenta IONPAY', target: '', placeholder: '', button: '' },
  }[action]

  if (!demoMode) {
    return (
      <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <section className="modal" role="dialog" aria-modal="true">
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
          <span className="eyebrow">Integración por etapas</span>
          <h2>{config.title}</h2>
          <div className="notice-box api-pending-operation">
            <strong>Operación todavía no conectada</strong>
            <p>En esta fase solo se conectaron autenticación, saldos y actividad. Esta acción no enviará ni modificará dinero.</p>
          </div>
          <button className="secondary-button" onClick={onClose}>Entendido</button>
        </section>
      </div>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!numeric || numeric <= 0) return setError('Ingresa un monto válido.')
    if ((action === 'send' || action === 'pay') && !name.trim()) return setError('Indica el destinatario.')
    if (numeric > state.wallet.pen) return setError('No tienes saldo suficiente en soles.')
    const kind = action === 'pay' ? 'payment' : 'send'
    onTransaction({ id: makeId(), kind, title: action === 'pay' ? 'Pago realizado' : 'Dinero enviado', counterpart: name.trim(), amount: numeric, currency: 'PEN', direction: 'out', status: 'Completado', channel: action === 'pay' ? 'Ion Pay' : 'IONPAY', createdAt: new Date().toISOString(), note: note.trim() || undefined }, -numeric)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        <span className="eyebrow">Modo demostración</span><h2>{config.title}</h2>
        {action === 'receive' ? <ReceivePanel user={state.user!} /> : (
          <form onSubmit={submit}>
            <label className="field"><span>{config.target}</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={config.placeholder} autoFocus /></label>
            <label className="field amount-field"><span>Monto</span><div><b>S/</b><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" inputMode="decimal" /></div><small>Disponible: {money(state.wallet.pen, 'PEN')}</small></label>
            <label className="field"><span>Nota <i>(opcional)</i></span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="¿Para qué es?" /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button" type="submit">{config.button}</button>
            <div className="safe-caption"><ShieldIcon /> Simulación local: no mueve dinero real</div>
          </form>
        )}
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

type AppMode = 'checking' | 'signed-out' | 'api' | 'demo'

function toIonUser(user: User): IonUser {
  return {
    name: user.name,
    phone: user.phone,
    alias: user.alias,
    kycStatus: user.kycStatus === 'VERIFIED' ? 'Verificado' : 'Pendiente',
  }
}

export default function App() {
  const [state, setState] = useState<IonState>({ user: null, wallet: { pen: 0, usdt: 0 }, transactions: [] })
  const [mode, setMode] = useState<AppMode>('checking')
  const [connectionError, setConnectionError] = useState('')
  const [tab, setTab] = useState<Tab>('home')
  const [action, setAction] = useState<Action>(null)
  const [receipt, setReceipt] = useState<Transaction | null>(null)
  const [toast, setToast] = useState('')

  const loadApiState = async (knownUser?: User) => {
    const [user, balances, transactions] = await Promise.all([
      knownUser ? Promise.resolve(knownUser) : api.getUser(),
      api.getBalances(),
      api.getActivity(),
    ])
    setState({
      user: toIonUser(user),
      wallet: { pen: balances.PEN ?? 0, usdt: balances.USDT ?? 0 },
      transactions,
    })
    setConnectionError('')
    setMode('api')
  }

  const restoreSession = async () => {
    if (!api.hasSession()) {
      setMode('signed-out')
      return
    }
    setMode('checking')
    try {
      await loadApiState()
    } catch (cause) {
      const message = cause instanceof IonPayApiError ? cause.message : 'No se pudo recuperar tu sesión.'
      setConnectionError(message)
      setMode('signed-out')
    }
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
    setConnectionError('')
    setMode('demo')
  }

  const reset = () => {
    api.clearSession()
    if (mode === 'demo') clearState()
    setState({ user: null, wallet: { pen: 0, usdt: 0 }, transactions: [] })
    setMode('signed-out')
    setTab('home')
  }

  const addTransaction = (transaction: Transaction, penChange: number, usdtChange = 0) => {
    if (mode !== 'demo') return
    setState((current) => ({ ...current, wallet: { pen: Math.max(0, current.wallet.pen + penChange), usdt: Math.max(0, current.wallet.usdt + usdtChange) }, transactions: [transaction, ...current.transactions] }))
    setAction(null)
    setReceipt(transaction)
    setToast('Simulación completada')
    window.setTimeout(() => setToast(''), 2400)
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
        {tab === 'services' && <ServicesPage state={state} openAction={(next) => setAction(next)} />}
        {tab === 'profile' && <ProfilePage user={state.user} onReset={reset} logoutLabel={mode === 'demo' ? 'Salir y borrar datos demo' : 'Cerrar sesión'} />}
      </main>
      <MobileNav tab={tab} setTab={setTab} onPay={() => setAction('pay')} />
      {action && <ActionModal action={action} state={state} demoMode={mode === 'demo'} onClose={() => setAction(null)} onTransaction={addTransaction} />}
      {receipt && <ReceiptModal item={receipt} onClose={() => setReceipt(null)} />}
      {toast && <div className="toast"><CheckIcon />{toast}</div>}
    </div>
  )
}

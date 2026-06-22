import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { IonState } from '../types'
import {
  CheckIcon,
  CheckoutIcon,
  CloseIcon,
  CodeIcon,
  CopyIcon,
  ExchangeIcon,
  GatewayIcon,
  GuideIcon,
  LimitIcon,
  LinkIcon,
  LockIcon,
  PayoutIcon,
  QrIcon,
  ShieldIcon,
  StoreIcon,
  TouchIcon,
} from './Icons'

type ServiceId = 'qr' | 'code' | 'link' | 'touch' | 'merchant' | 'checkout' | 'payouts' | 'gateway' | 'limits' | 'safe' | 'exchange' | 'guide'

interface Service {
  id: ServiceId
  name: string
  subtitle: string
  group: 'Pagos y cobros' | 'Negocios' | 'Cuenta y control'
  icon: typeof QrIcon
  tone: string
  badge?: string
}

const services: Service[] = [
  { id: 'qr', name: 'Ion QR', subtitle: 'Cobra y recibe por QR', group: 'Pagos y cobros', icon: QrIcon, tone: 'green' },
  { id: 'code', name: 'Ion Code', subtitle: 'Códigos temporales', group: 'Pagos y cobros', icon: CodeIcon, tone: 'blue', badge: 'Nuevo' },
  { id: 'link', name: 'Ion Link', subtitle: 'Enlaces de cobro', group: 'Pagos y cobros', icon: LinkIcon, tone: 'violet', badge: 'Nuevo' },
  { id: 'touch', name: 'IonTouch', subtitle: 'Pagos por proximidad', group: 'Pagos y cobros', icon: TouchIcon, tone: 'orange', badge: 'Android' },
  { id: 'merchant', name: 'Ion Merchant', subtitle: 'Herramientas para negocios', group: 'Negocios', icon: StoreIcon, tone: 'teal' },
  { id: 'checkout', name: 'Ion Checkout', subtitle: 'Cobros para tiendas online', group: 'Negocios', icon: CheckoutIcon, tone: 'green' },
  { id: 'payouts', name: 'Ion Payouts', subtitle: 'Recibe ingresos digitales', group: 'Negocios', icon: PayoutIcon, tone: 'blue' },
  { id: 'gateway', name: 'Ion Gateway', subtitle: 'Conexión para plataformas', group: 'Negocios', icon: GatewayIcon, tone: 'violet', badge: 'B2B' },
  { id: 'limits', name: 'Ion Limits', subtitle: 'Límites y nivel de cuenta', group: 'Cuenta y control', icon: LimitIcon, tone: 'orange' },
  { id: 'safe', name: 'Ion Safe', subtitle: 'Seguridad y dispositivos', group: 'Cuenta y control', icon: LockIcon, tone: 'teal' },
  { id: 'exchange', name: 'IonExchange Link', subtitle: 'Conecta tu inversión', group: 'Cuenta y control', icon: ExchangeIcon, tone: 'green' },
  { id: 'guide', name: 'Ion Guide', subtitle: 'Aprende a usar IONPAY', group: 'Cuenta y control', icon: GuideIcon, tone: 'blue' },
]

interface ServicesPageProps {
  state: IonState
  openAction: (action: 'receive' | 'convert') => void
}

export default function ServicesPage({ state, openAction }: ServicesPageProps) {
  const [active, setActive] = useState<ServiceId | null>(null)
  const [merchantActive, setMerchantActive] = useState(false)
  const [exchangeLinked, setExchangeLinked] = useState(false)

  return (
    <section className="page-section services-page">
      <div className="page-heading"><span className="eyebrow">Ecosistema IONPAY</span><h1>Servicios</h1><p>Todo lo que necesitas para pagar, cobrar, proteger y mover tu dinero.</p></div>
      {(['Pagos y cobros', 'Negocios', 'Cuenta y control'] as const).map((group) => (
        <section className="service-group" key={group}>
          <div className="service-group-title"><h2>{group}</h2><span>{services.filter((service) => service.group === group).length} módulos</span></div>
          <div className="services-grid">
            {services.filter((service) => service.group === group).map((service) => {
              const Icon = service.icon
              return <button className="service-card" key={service.id} onClick={() => setActive(service.id)}><span className={`service-icon ${service.tone}`}><Icon /></span><span className="service-copy"><strong>{service.name}</strong><small>{service.subtitle}</small></span>{service.badge && <i>{service.badge}</i>}<span className="service-arrow">›</span></button>
            })}
          </div>
        </section>
      ))}
      {active && <ServiceModal service={active} state={state} close={() => setActive(null)} openAction={(action) => { setActive(null); openAction(action) }} merchantActive={merchantActive} setMerchantActive={setMerchantActive} exchangeLinked={exchangeLinked} setExchangeLinked={setExchangeLinked} />}
    </section>
  )
}

interface ServiceModalProps {
  service: ServiceId
  state: IonState
  close: () => void
  openAction: (action: 'receive' | 'convert') => void
  merchantActive: boolean
  setMerchantActive: (active: boolean) => void
  exchangeLinked: boolean
  setExchangeLinked: (active: boolean) => void
}

function ServiceModal(props: ServiceModalProps) {
  const meta = services.find((service) => service.id === props.service)!
  const Icon = meta.icon
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && props.close()}><section className="modal service-modal" role="dialog" aria-modal="true"><button className="modal-close" aria-label="Cerrar" onClick={props.close}><CloseIcon /></button><div className={`module-heading ${meta.tone}`}><span><Icon /></span><div><small>{meta.group}</small><h2>{meta.name}</h2></div></div><ServiceContent {...props} /></section></div>
}

function ServiceContent(props: ServiceModalProps) {
  switch (props.service) {
    case 'qr': return <IntroPanel text="Comparte tu QR personal para recibir dinero. Los QR dinámicos para comercios pueden incluir un monto exacto." button="Mostrar mi QR" onClick={() => props.openAction('receive')} features={['QR personal', 'Confirmación inmediata', 'Comprobante automático']} />
    case 'code': return <IonCodePanel />
    case 'link': return <IonLinkPanel alias={props.state.user!.alias} />
    case 'touch': return <TouchPanel />
    case 'merchant': return <MerchantPanel state={props.state} active={props.merchantActive} setActive={props.setMerchantActive} />
    case 'checkout': return <CheckoutPanel alias={props.state.user!.alias} />
    case 'payouts': return <PayoutsPanel alias={props.state.user!.alias} />
    case 'gateway': return <GatewayPanel />
    case 'limits': return <LimitsPanel state={props.state} />
    case 'safe': return <SafePanel />
    case 'exchange': return <ExchangePanel state={props.state} linked={props.exchangeLinked} setLinked={props.setExchangeLinked} convert={() => props.openAction('convert')} />
    case 'guide': return <GuidePanel />
  }
}

function IntroPanel({ text, features, button, onClick }: { text: string; features: string[]; button: string; onClick: () => void }) {
  return <div className="module-body"><p className="module-intro">{text}</p><div className="feature-list">{features.map((feature) => <div key={feature}><CheckIcon /><span>{feature}</span></div>)}</div><button className="primary-button" onClick={onClick}>{button}</button></div>
}

function IonCodePanel() {
  const [amount, setAmount] = useState('')
  const [code, setCode] = useState('')
  const [seconds, setSeconds] = useState(60)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000)
    return () => window.clearInterval(timer)
  }, [code, seconds])

  const generate = (event: FormEvent) => {
    event.preventDefault()
    if (Number(amount) <= 0) return setError('Ingresa un monto válido.')
    setError(''); setCode(`ION-${Math.floor(1000 + Math.random() * 9000)}`); setSeconds(60)
  }

  if (code) return <div className="module-body code-result"><span className={`live-dot ${seconds <= 0 ? 'expired' : ''}`}><i /> {seconds > 0 ? 'Código activo' : 'Código expirado'}</span><strong className="generated-code">{code}</strong><p>Monto de cobro</p><h3>S/ {Number(amount).toFixed(2)}</h3><div className="countdown">Expira en <strong>{seconds} segundos</strong></div><button className="secondary-button" onClick={() => { setCode(''); setAmount('') }}>Generar otro código</button></div>

  return <form className="module-body" onSubmit={generate}><p className="module-intro">Genera un código de cobro temporal, corto y de un solo uso.</p><label className="field amount-field"><span>Monto a cobrar</span><div><b>S/</b><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" inputMode="decimal" autoFocus /></div></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" type="submit">Generar Ion Code</button><div className="safe-caption"><ShieldIcon /> Expira automáticamente en 60 segundos</div></form>
}

function IonLinkPanel({ alias }: { alias: string }) {
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (Number(amount) <= 0 || !concept.trim()) return
    setLink(`https://pay.ionpay.app/${alias}?amount=${Number(amount).toFixed(2)}&ref=${encodeURIComponent(concept.trim())}`)
  }
  const copy = async () => { try { await navigator.clipboard.writeText(link) } catch { /* unavailable */ } setCopied(true) }
  if (link) return <div className="module-body link-result"><div className="success-mark"><CheckIcon /></div><h3>Enlace creado</h3><p>Compártelo por WhatsApp, redes sociales o mensajería.</p><div className="generated-link"><span>{link}</span><button onClick={copy} aria-label="Copiar enlace">{copied ? <CheckIcon /> : <CopyIcon />}</button></div><button className="secondary-button" onClick={() => setLink('')}>Crear otro enlace</button></div>
  return <form className="module-body" onSubmit={submit}><p className="module-intro">Cobra a distancia con un enlace de monto fijo y un solo uso.</p><label className="field amount-field"><span>Monto a cobrar</span><div><b>S/</b><input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" inputMode="decimal" autoFocus /></div></label><label className="field"><span>Concepto</span><input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="Ej. Reserva o pedido" /></label><button className="primary-button" type="submit" disabled={Number(amount) <= 0 || !concept.trim()}>Crear Ion Link</button></form>
}

function TouchPanel() {
  return <div className="module-body"><p className="module-intro">IonTouch permitirá acercar dos teléfonos Android para iniciar un pago por NFC.</p><div className="touch-visual"><div><TouchIcon /></div><span><i /><i /><i /></span><div><StoreIcon /></div></div><div className="notice-box"><strong>Integración nativa pendiente</strong><p>El flujo visual está preparado. La lectura NFC se activará dentro del APK Android después de integrar el complemento nativo y las llaves de seguridad.</p></div></div>
}

function MerchantPanel({ state, active, setActive }: { state: IonState; active: boolean; setActive: (active: boolean) => void }) {
  const sales = state.transactions.filter((transaction) => transaction.direction === 'in' && transaction.currency === 'PEN').reduce((total, transaction) => total + transaction.amount, 0)
  if (!active) return <IntroPanel text="Convierte tu cuenta en una herramienta de cobro para ventas presenciales y digitales." features={['Ventas y comprobantes', 'QR, Code y Link', 'Roles para cajeros']} button="Activar perfil comercial demo" onClick={() => setActive(true)} />
  return <div className="module-body"><span className="verified-badge"><CheckIcon /> Perfil comercial activo</span><div className="merchant-stats"><div><span>Ventas registradas</span><strong>S/ {sales.toFixed(2)}</strong></div><div><span>Operaciones</span><strong>{state.transactions.filter((item) => item.direction === 'in').length}</strong></div></div><div className="feature-list"><div><CheckIcon /><span>Ion QR habilitado</span></div><div><CheckIcon /><span>Ion Code habilitado</span></div><div><CheckIcon /><span>Ion Link habilitado</span></div></div><button className="secondary-button" onClick={() => setActive(false)}>Desactivar modo comercio</button></div>
}

function CheckoutPanel({ alias }: { alias: string }) {
  return <div className="module-body"><p className="module-intro">Recibe pagos desde una tienda online mediante un checkout alojado por IONPAY.</p><div className="checkout-preview"><span>Vista previa</span><strong>{alias.replace('.ion', '')} Store</strong><div><small>Total</small><b>S/ 129.90</b></div><button>Pagar con IONPAY</button></div><div className="notice-box"><strong>Entorno de integración</strong><p>El checkout visual está disponible. Las credenciales API y liquidaciones se habilitarán con el backend comercial.</p></div></div>
}

function PayoutsPanel({ alias }: { alias: string }) {
  return <div className="module-body"><p className="module-intro">Usa tu cuenta IONPAY como destino para ingresos de plataformas digitales.</p><div className="payout-account"><small>ID receptor</small><strong>PAY-{alias.toUpperCase()}</strong><button aria-label="Copiar ID"><CopyIcon /></button></div><div className="feature-list"><div><CheckIcon /><span>Ingresos identificados por plataforma</span></div><div><CheckIcon /><span>Conversión a saldo utilizable</span></div><div><CheckIcon /><span>Comprobante y trazabilidad</span></div></div><div className="notice-box"><strong>Proveedores en preparación</strong><p>Las conexiones externas se habilitarán individualmente después de validar cumplimiento y origen de fondos.</p></div></div>
}

function GatewayPanel() {
  return <div className="module-body"><p className="module-intro">Infraestructura B2B para que plataformas externas paguen a usuarios verificados de IONPAY.</p><div className="gateway-flow"><span>Plataforma</span><b>→</b><span>Ion Gateway</span><b>→</b><span>Usuario</span></div><div className="feature-list"><div><CheckIcon /><span>Validación de plataforma y receptor</span></div><div><CheckIcon /><span>Estados y reversiones controladas</span></div><div><CheckIcon /><span>Conciliación de operaciones</span></div></div><button className="secondary-button" disabled>Acceso empresarial próximamente</button></div>
}

function LimitsPanel({ state }: { state: IonState }) {
  const spent = useMemo(() => state.transactions.filter((item) => item.direction === 'out' && item.currency === 'PEN').reduce((total, item) => total + item.amount, 0), [state.transactions])
  const verified = state.user!.kycStatus === 'Verificado'
  const daily = verified ? 5000 : 500
  const monthly = verified ? 25000 : 1500
  return <div className="module-body"><div className="level-card"><span>Nivel actual</span><strong>{verified ? 'Nivel 2' : 'Nivel 0'}</strong><small>{verified ? 'KYC aprobado · Cuenta personal' : 'Registro básico · KYC pendiente'}</small></div><LimitRow name="Límite diario" used={Math.min(spent, daily)} total={daily} /><LimitRow name="Límite mensual" used={Math.min(spent, monthly)} total={monthly} /><div className="notice-box"><strong>{verified ? '¿Necesitas límites mayores?' : 'Completa tu verificación'}</strong><p>{verified ? 'Mantén un historial positivo y valida una cuenta bancaria propia para solicitar el Nivel 3.' : 'Valida tu identidad para acceder al Nivel 2 y habilitar límites operativos mayores.'}</p></div></div>
}

function LimitRow({ name, used, total }: { name: string; used: number; total: number }) {
  return <div className="module-limit"><div><span>{name}</span><strong>S/ {(total - used).toLocaleString('es-PE')} disponible</strong></div><div className="progress"><i style={{ width: `${Math.min(100, used / total * 100)}%` }} /></div><small>S/ {used.toLocaleString('es-PE')} usado de S/ {total.toLocaleString('es-PE')}</small></div>
}

function SafePanel() {
  const [biometric, setBiometric] = useState(true)
  const [alerts, setAlerts] = useState(true)
  return <div className="module-body"><div className="security-score"><ShieldIcon /><div><span>Protección de la cuenta</span><strong>Alta</strong></div></div><ToggleRow name="Acceso biométrico" detail="Confirma con huella o reconocimiento facial" value={biometric} setValue={setBiometric} /><ToggleRow name="Alertas de seguridad" detail="Notifica accesos y movimientos sensibles" value={alerts} setValue={setAlerts} /><div className="device-row"><span>Dispositivo actual</span><strong>Android · Confiable</strong></div><div className="notice-box"><strong>Modo demostración</strong><p>La biometría real se conectará con Android Keystore dentro del APK.</p></div></div>
}

function ToggleRow({ name, detail, value, setValue }: { name: string; detail: string; value: boolean; setValue: (value: boolean) => void }) {
  return <div className="control-row module-toggle"><div><strong>{name}</strong><small>{detail}</small></div><button className={`switch ${value ? 'on' : ''}`} aria-label={name} aria-pressed={value} onClick={() => setValue(!value)}><i /></button></div>
}

function ExchangePanel({ state, linked, setLinked, convert }: { state: IonState; linked: boolean; setLinked: (linked: boolean) => void; convert: () => void }) {
  if (!linked) return <div className="module-body"><p className="module-intro">Vincula tu identidad verificada con IonExchange para usar el saldo USDT exclusivamente en inversión.</p><div className="identity-match"><div><span>IONPAY</span><CheckIcon /></div><b>Identidad coincidente</b><div><span>IonExchange</span><CheckIcon /></div></div><button className="primary-button" onClick={() => setLinked(true)} disabled={state.user!.kycStatus !== 'Verificado'}>Vincular cuenta demo</button></div>
  return <div className="module-body"><span className="verified-badge"><CheckIcon /> Cuenta vinculada</span><div className="exchange-balance"><span>Disponible para inversión</span><strong>{state.wallet.usdt.toFixed(2)} USDT</strong></div><div className="feature-list"><div><CheckIcon /><span>Identidad y KYC coincidentes</span></div><div><CheckIcon /><span>Sin direcciones blockchain manuales</span></div></div><button className="primary-button" onClick={convert}>Convertir más saldo</button><button className="text-button" onClick={() => setLinked(false)}>Desvincular demo</button></div>
}

function GuidePanel() {
  const [open, setOpen] = useState('saldos')
  const guides = [
    ['saldos', '¿Cuál es la diferencia entre PEN y USDT?', 'El saldo PEN se usa para pagos cotidianos. El USDT se utiliza exclusivamente para inversión mediante IonExchange.'],
    ['pagos', '¿Cómo confirmo un pago seguro?', 'Revisa siempre el receptor, monto, moneda y canal antes de confirmar con PIN o biometría.'],
    ['limites', '¿Por qué existen límites?', 'Protegen tu cuenta, reducen fraude y permiten cumplir las reglas financieras de cada país.'],
  ]
  return <div className="module-body guide-list">{guides.map(([id, title, answer]) => <button key={id} className={open === id ? 'open' : ''} onClick={() => setOpen(open === id ? '' : id)}><strong>{title}<span>{open === id ? '−' : '+'}</span></strong>{open === id && <p>{answer}</p>}</button>)}</div>
}

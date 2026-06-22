import type { IonState } from '../types'
import { ActivityIcon, QrIcon, StoreIcon } from './Icons'

interface ServicesPageProps {
  state: IonState
  openAction: (action: 'receive') => void
}

export default function ServicesPage({ state, openAction }: ServicesPageProps) {
  const received = state.transactions.filter((transaction) => transaction.direction === 'in' && transaction.currency === 'PEN')
  const totalReceived = received.reduce((total, transaction) => total + transaction.amount, 0)

  return (
    <section className="page-section services-page">
      <div className="page-heading">
        <span className="eyebrow">ionPAY V1</span>
        <h1>Servicios</h1>
        <p>Accesos básicos para recibir saldo, revisar actividad y usar modo comercio simple.</p>
      </div>
      <section className="service-group">
        <div className="service-group-title"><h2>Funciones V1</h2><span>3 módulos</span></div>
        <div className="services-grid">
          <button className="service-card" onClick={() => openAction('receive')}><span className="service-icon green"><QrIcon /></span><span className="service-copy"><strong>Recibir por QR</strong><small>Comparte tu QR o IonTag</small></span><span className="service-arrow">›</span></button>
          <button className="service-card" disabled><span className="service-icon teal"><StoreIcon /></span><span className="service-copy"><strong>Modo comercio básico</strong><small>S/ {totalReceived.toFixed(2)} recibidos · {received.length} operaciones</small></span><span className="service-arrow">›</span></button>
          <button className="service-card" disabled><span className="service-icon blue"><ActivityIcon /></span><span className="service-copy"><strong>Historial y comprobantes</strong><small>Disponible desde Actividad</small></span><span className="service-arrow">›</span></button>
        </div>
      </section>
    </section>
  )
}

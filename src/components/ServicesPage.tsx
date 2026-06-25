import { useState } from 'react'
import type { IonState, PaymentRequest } from '../types'
import { ActivityIcon, CheckIcon, PayIcon, QrIcon, StoreIcon } from './Icons'
import PaymentRequestQr from './PaymentRequestQr'

interface ServicesPageProps {
  state: IonState
  paymentRequests: {
    received: PaymentRequest[]
    created: PaymentRequest[]
  }
  openAction: (action: 'receive') => void
  onPayRequest: (id: string) => Promise<void>
  onCancelRequest: (id: string) => Promise<void>
  processingRequestId: string | null
  requestOperationPending: boolean
}

function money(amount: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)
}

function statusLabel(status: PaymentRequest['status']) {
  if (status === 'PENDING') return 'Pendiente'
  if (status === 'PAID') return 'Pagada'
  if (status === 'CANCELLED') return 'Cancelada'
  return 'Expirada'
}

function RequestRow({ request, kind, processing, disabled, onPay, onCancel }: { request: PaymentRequest; kind: 'received' | 'created'; processing: boolean; disabled: boolean; onPay: (id: string) => void; onCancel: (id: string) => void }) {
  const isPending = request.status === 'PENDING'
  const alias = kind === 'received' ? request.requesterAlias : request.payerAlias
  const detail = kind === 'received' ? 'Solicitud recibida' : 'Solicitud creada'
  const readableStatus = statusLabel(request.status)

  return (
    <div className="request-with-qr">
      <div className="transaction-row">
        <span className={`transaction-icon ${kind === 'received' ? 'outgoing' : 'incoming'}`}><PayIcon /></span>
        <span className="transaction-main"><strong>@{alias}</strong><small>{detail} · {request.note || request.reference}</small></span>
        <span className={`transaction-amount ${kind === 'received' ? 'out' : 'in'}`}><strong>{money(request.amount)}</strong><small>{readableStatus}</small></span>
        {kind === 'received' && isPending && <button className="secondary-button" type="button" disabled={disabled} onClick={() => onPay(request.id)}>{processing ? 'Pagando...' : 'Pagar'}</button>}
        {kind === 'created' && isPending && <button className="secondary-button" type="button" disabled={disabled} onClick={() => onCancel(request.id)}>{processing ? 'Cancelando...' : 'Cancelar'}</button>}
      </div>
      {isPending && <PaymentRequestQr request={request} identifier={`@${alias}`} statusText={readableStatus} />}
    </div>
  )
}

export default function ServicesPage({ state, paymentRequests, openAction, onPayRequest, onCancelRequest, processingRequestId, requestOperationPending }: ServicesPageProps) {
  const [merchantActive, setMerchantActive] = useState(false)
  const received = state.transactions.filter((transaction) => transaction.direction === 'in' && transaction.currency === 'PEN')
  const totalReceived = received.reduce((total, transaction) => total + transaction.amount, 0)
  const pendingReceived = paymentRequests.received.filter((request) => request.status === 'PENDING')
  const visibleCreated = paymentRequests.created.slice(0, 6)

  return (
    <section className="page-section services-page">
      <div className="page-heading">
        <span className="eyebrow">ionPAY V1</span>
        <h1>Cobros</h1>
        <p>Superficie V1 limitada a PEN: recibir saldo, crear solicitudes de pago, pagar solicitudes recibidas y revisar actividad.</p>
      </div>

      <section className="service-group">
        <div className="service-group-title"><h2>Funciones de cobro V1</h2><span>3 módulos</span></div>
        <div className="services-grid">
          <button className="service-card" onClick={() => openAction('receive')}><span className="service-icon green"><QrIcon /></span><span className="service-copy"><strong>Crear solicitud de pago</strong><small>Solicita PEN a un IonTag</small></span><span className="service-arrow">›</span></button>
          <button className="service-card" onClick={() => setMerchantActive(!merchantActive)}><span className="service-icon teal"><StoreIcon /></span><span className="service-copy"><strong>Modo comercio básico</strong><small>{merchantActive ? 'Activo para revisión V1' : 'Activar cobro simple'}</small></span><span className="service-arrow">›</span></button>
          <button className="service-card" disabled><span className="service-icon blue"><ActivityIcon /></span><span className="service-copy"><strong>Historial y comprobantes</strong><small>Disponible desde Actividad</small></span><span className="service-arrow">›</span></button>
        </div>
      </section>

      <section className="section-card full-list" style={{ marginBottom: 18 }}>
        <div className="section-title" style={{ padding: '18px 18px 0' }}><div><span className="eyebrow">Solicitudes recibidas</span><h2>Por pagar</h2></div><PayIcon /></div>
        {pendingReceived.length ? pendingReceived.map((request) => <RequestRow key={request.id} request={request} kind="received" processing={processingRequestId === request.id} disabled={requestOperationPending} onPay={(id) => void onPayRequest(id)} onCancel={(id) => void onCancelRequest(id)} />) : <div className="empty-state"><CheckIcon /><strong>No tienes solicitudes pendientes</strong><span>Las solicitudes asignadas a tu IonTag aparecerán aquí.</span></div>}
      </section>

      <section className="section-card full-list" style={{ marginBottom: 18 }}>
        <div className="section-title" style={{ padding: '18px 18px 0' }}><div><span className="eyebrow">Solicitudes creadas</span><h2>Cobros solicitados</h2></div><QrIcon /></div>
        {visibleCreated.length ? visibleCreated.map((request) => <RequestRow key={request.id} request={request} kind="created" processing={processingRequestId === request.id} disabled={requestOperationPending} onPay={(id) => void onPayRequest(id)} onCancel={(id) => void onCancelRequest(id)} />) : <div className="empty-state"><QrIcon /><strong>No creaste solicitudes</strong><span>Crea una solicitud para pedir un pago en PEN.</span></div>}
      </section>

      {merchantActive && (
        <section className="section-card account-status">
          <div className="section-title compact"><div><span className="eyebrow">Comercio básico</span><h2>Solo revisión de cobros recibidos</h2></div><CheckIcon /></div>
          <div className="merchant-stats"><div><span>Cobros recibidos</span><strong>{money(totalReceived)}</strong></div><div><span>Operaciones</span><strong>{received.length}</strong></div></div>
          <button className="secondary-button" onClick={() => setMerchantActive(false)}>Desactivar modo comercio</button>
        </section>
      )}
    </section>
  )
}

import { useState } from 'react'
import type { IonState, PaymentRequest } from '../types'
import { ActivityIcon, CheckIcon, PayIcon, QrIcon } from './Icons'
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

type RequestKind = 'received' | 'created'
type RequestTab = RequestKind

interface SelectedRequest {
  request: PaymentRequest
  kind: RequestKind
  intent?: 'detail' | 'activity'
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

function statusTone(status: PaymentRequest['status']) {
  if (status === 'PENDING') return 'pending'
  if (status === 'PAID') return 'paid'
  return 'closed'
}

function statusMicrocopy(status: PaymentRequest['status'], kind: RequestKind) {
  if (status === 'PENDING') return kind === 'received' ? 'Solicitud pendiente · QR local informativo' : 'Solicitud enviada · QR local informativo'
  if (status === 'PAID') return 'Confirmación disponible en Activity'
  if (status === 'CANCELLED') return 'Cancelada · no pagable'
  return 'Vencida · no pagable'
}

function detailCopy(status: PaymentRequest['status']) {
  if (status === 'PENDING') return 'Pendiente no es pago confirmado. El QR local solo identifica la solicitud; no paga, no confirma cobro y no genera receipt.'
  if (status === 'PAID') return 'Una request pagada debe validarse en Activity. El receipt/proof pertenece a actividad confirmada, no a la card de request.'
  if (status === 'CANCELLED') return 'Esta solicitud fue cancelada. No es pagable y no debe usarse como prueba de cobro.'
  return 'Esta solicitud expiró. No es pagable y no debe usarse como prueba de cobro.'
}

function requestContact(request: PaymentRequest, kind: RequestKind) {
  return kind === 'received' ? request.requesterAlias : request.payerAlias
}

function emptyCopy(tab: RequestTab) {
  return tab === 'received'
    ? 'No hay requests recibidas por pagar. Si una operación se confirmó, revisa Activity.'
    : 'No hay requests creadas visibles. Crear una request no confirma cobro por sí sola.'
}

function primaryActionLabel(request: PaymentRequest, kind: RequestKind, processing: boolean) {
  if (request.status === 'PENDING' && kind === 'received') return processing ? 'Pagando...' : 'Pagar'
  if (request.status === 'PAID') return 'Ver Activity'
  return 'Ver detalle'
}

export default function ServicesPage({ state, paymentRequests, openAction, onPayRequest, onCancelRequest, processingRequestId, requestOperationPending }: ServicesPageProps) {
  const [activeTab, setActiveTab] = useState<RequestTab>('received')
  const [selected, setSelected] = useState<SelectedRequest | null>(null)
  const pendingReceived = paymentRequests.received.filter((request) => request.status === 'PENDING').length
  const pendingCreated = paymentRequests.created.filter((request) => request.status === 'PENDING').length
  const activityCount = state.transactions.filter((transaction) => transaction.currency === 'PEN' && transaction.kind !== 'conversion').length
  const activeRequests = activeTab === 'received' ? paymentRequests.received : paymentRequests.created
  const selectedAlias = selected ? requestContact(selected.request, selected.kind) : ''
  const selectedStatus = selected ? statusLabel(selected.request.status) : ''

  function handlePrimary(request: PaymentRequest, kind: RequestKind) {
    if (request.status === 'PENDING' && kind === 'received') {
      void onPayRequest(request.id)
      return
    }
    setSelected({ request, kind, intent: request.status === 'PAID' ? 'activity' : 'detail' })
  }

  return (
    <section className="page-section services-page requests-mobile-screen">
      <style>{servicesScreenStyles}</style>

      <header className="requests-mobile-header">
        <div>
          <span className="eyebrow">ionPAY V1 · PEN only</span>
          <h1>Cobros</h1>
          <p>Requests ordenan cobros. Activity confirma operaciones y receipts.</p>
        </div>
        <button className="requests-create-button" type="button" onClick={() => openAction('receive')}>Crear</button>
      </header>

      <section className="requests-summary-card" aria-label="Resumen de solicitudes">
        <div><span>Por pagar</span><strong>{pendingReceived}</strong></div>
        <div><span>Enviadas</span><strong>{pendingCreated}</strong></div>
        <div><span>Activity</span><strong>{activityCount}</strong></div>
      </section>

      <div className="requests-segment" role="tablist" aria-label="Tipo de solicitudes">
        <button type="button" role="tab" aria-selected={activeTab === 'received'} className={activeTab === 'received' ? 'active' : undefined} onClick={() => setActiveTab('received')}>Recibidas <span>{paymentRequests.received.length}</span></button>
        <button type="button" role="tab" aria-selected={activeTab === 'created'} className={activeTab === 'created' ? 'active' : undefined} onClick={() => setActiveTab('created')}>Creadas <span>{paymentRequests.created.length}</span></button>
      </div>

      <p className="requests-section-note">
        {activeTab === 'received' ? 'Pendiente no es pago confirmado. QR local solo aparece en detalle.' : 'Pagada se valida en Activity. Cancelada/expirada no es pagable.'}
      </p>

      <section className="requests-card-list" aria-label={activeTab === 'received' ? 'Solicitudes recibidas' : 'Solicitudes creadas'}>
        {activeRequests.length ? activeRequests.map((request) => {
          const kind = activeTab
          const alias = requestContact(request, kind)
          const readableStatus = statusLabel(request.status)
          const processing = processingRequestId === request.id
          const canCancel = request.status === 'PENDING' && kind === 'created'
          const hasSecondaryDetail = (request.status === 'PENDING' && kind === 'received') || request.status === 'PAID'

          return (
            <article className={`request-compact-card ${statusTone(request.status)}`} key={request.id}>
              <div className="request-card-topline">
                <span className="request-avatar">@</span>
                <div className="request-card-main">
                  <strong>@{alias}</strong>
                  <small>{statusMicrocopy(request.status, kind)}</small>
                </div>
                <div className="request-card-amount">
                  <strong>{money(request.amount)}</strong>
                  <span>{readableStatus}</span>
                </div>
              </div>

              <div className="request-card-actions">
                <button className="request-primary-action" type="button" disabled={request.status === 'PENDING' && kind === 'received' && requestOperationPending} onClick={() => handlePrimary(request, kind)}>
                  {primaryActionLabel(request, kind, processing)}
                </button>
                {hasSecondaryDetail && <button className="request-secondary-action" type="button" onClick={() => setSelected({ request, kind })}>Detalle</button>}
                {canCancel && <button className="request-secondary-action danger" type="button" disabled={requestOperationPending} onClick={() => void onCancelRequest(request.id)}>{processing ? 'Cancelando...' : 'Cancelar'}</button>}
              </div>
            </article>
          )
        }) : (
          <div className="requests-empty-state">
            <CheckIcon />
            <strong>{activeTab === 'received' ? 'Sin requests recibidas' : 'Sin requests creadas'}</strong>
            <span>{emptyCopy(activeTab)}</span>
          </div>
        )}
      </section>

      <section className="requests-activity-note" aria-label="Activity y receipts">
        <ActivityIcon />
        <span>Activity/receipt es la fuente separada de confirmación. PENDING no genera proof.</span>
      </section>

      {selected && (
        <div className="request-sheet-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="request-bottom-sheet" role="dialog" aria-modal="true" aria-label={`Detalle de solicitud ${selected.request.reference}`} onClick={(event) => event.stopPropagation()}>
            <div className="request-sheet-handle" />
            <header className="request-sheet-header">
              <div>
                <span className={`request-status-pill ${statusTone(selected.request.status)}`}>{selectedStatus}</span>
                <h2>@{selectedAlias}</h2>
                <p>{detailCopy(selected.request.status)}</p>
              </div>
              <button type="button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}>×</button>
            </header>

            <dl className="request-sheet-details">
              <div><dt>Monto</dt><dd>{money(selected.request.amount)}</dd></div>
              <div><dt>Moneda</dt><dd>PEN</dd></div>
              <div><dt>Referencia</dt><dd>{selected.request.reference}</dd></div>
              <div><dt>Estado</dt><dd>{selectedStatus}</dd></div>
            </dl>

            {selected.request.status === 'PENDING' ? (
              <PaymentRequestQr request={selected.request} identifier={`@${selectedAlias}`} statusText={selectedStatus} />
            ) : (
              <div className="request-sheet-safety-note"><QrIcon /><span>QR local no disponible para este estado. La solicitud ya no debe usarse como acción de pago.</span></div>
            )}

            {selected.intent === 'activity' && <div className="request-sheet-safety-note"><ActivityIcon /><span>Verifica la confirmación en Activity. Esta vista no genera receipt ni comprobante bancario.</span></div>}
          </section>
        </div>
      )}
    </section>
  )
}

const servicesScreenStyles = `
.requests-mobile-screen { max-width: 720px; margin-inline: auto; }
.requests-mobile-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
.requests-mobile-header h1 { margin: 4px 0 4px; font: 900 30px/1 'Manrope', system-ui, sans-serif; letter-spacing: -1.4px; }
.requests-mobile-header p { max-width: 360px; margin: 0; color: var(--muted); font-size: 12px; line-height: 1.35; }
.requests-create-button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 999px; color: #0b1309; background: var(--lime); font-weight: 900; }
.requests-summary-card { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; }
.requests-summary-card div { display: grid; gap: 3px; padding: 12px 10px; border: 1px solid var(--line); border-radius: 17px; background: white; }
.requests-summary-card span { color: var(--muted); font-size: 9px; }
.requests-summary-card strong { font: 900 20px/1 'Manrope', system-ui, sans-serif; }
.requests-segment { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: 16px; background: #f2f5f2; }
.requests-segment button { min-height: 38px; border: 0; border-radius: 12px; color: #68706c; background: transparent; font-size: 12px; font-weight: 900; }
.requests-segment button.active { color: var(--ink); background: white; box-shadow: 0 6px 14px rgba(28, 43, 35, .06); }
.requests-segment span { color: inherit; opacity: .58; }
.requests-section-note { margin: 9px 2px 11px; color: #68736f; font-size: 10px; line-height: 1.35; }
.requests-card-list { display: grid; gap: 9px; }
.request-compact-card { padding: 12px; border: 1px solid var(--line); border-radius: 19px; background: white; box-shadow: 0 8px 22px rgba(31,53,45,.035); }
.request-card-topline { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.request-avatar { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 50%; color: #101312; background: #eff3ef; font-size: 12px; font-weight: 900; }
.request-card-main { min-width: 0; display: grid; gap: 3px; }
.request-card-main strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.request-card-main small { color: #77837f; font-size: 10px; line-height: 1.25; }
.request-card-amount { display: grid; gap: 3px; text-align: right; }
.request-card-amount strong { font-size: 13px; }
.request-card-amount span { justify-self: end; padding: 3px 7px; border-radius: 999px; color: #6b4d0b; background: #fff6de; font-size: 8px; font-weight: 900; }
.request-compact-card.paid .request-card-amount span { color: #12624f; background: #e5f8f1; }
.request-compact-card.closed .request-card-amount span { color: #68716d; background: #eef1ee; }
.request-card-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 11px; }
.request-primary-action, .request-secondary-action { min-height: 38px; border: 0; border-radius: 13px; font-size: 11px; font-weight: 900; }
.request-primary-action { color: #0b1309; background: var(--lime); }
.request-secondary-action { padding: 0 13px; color: #1f2824; background: #eef2ee; }
.request-secondary-action.danger { color: #8e3a2f; background: #fff0ec; }
.requests-empty-state { display: grid; place-items: center; gap: 7px; min-height: 150px; padding: 18px; border: 1px dashed #d8ddd9; border-radius: 20px; color: #77837f; text-align: center; background: #fbfcfb; }
.requests-empty-state svg { width: 24px; }
.requests-empty-state strong { color: var(--ink); font-size: 13px; }
.requests-empty-state span { max-width: 250px; font-size: 10px; line-height: 1.45; }
.requests-activity-note { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 10px; align-items: center; margin-top: 13px; padding: 12px; border-radius: 16px; color: #5f6d68; background: #f5f8f5; font-size: 10px; line-height: 1.4; }
.requests-activity-note svg { width: 18px; }
.request-sheet-backdrop { position: fixed; z-index: 60; inset: 0; display: flex; align-items: flex-end; justify-content: center; background: rgba(0,0,0,.28); padding: 0 10px; }
.request-bottom-sheet { width: min(440px, 100%); max-height: 88vh; overflow: auto; padding: 9px 14px calc(16px + env(safe-area-inset-bottom)); border-radius: 25px 25px 0 0; background: white; box-shadow: 0 -18px 38px rgba(0,0,0,.18); }
.request-sheet-handle { width: 42px; height: 4px; margin: 0 auto 13px; border-radius: 999px; background: #d8ddd9; }
.request-sheet-header { display: grid; grid-template-columns: minmax(0, 1fr) 36px; gap: 12px; align-items: start; margin-bottom: 12px; }
.request-sheet-header h2 { margin: 7px 0 4px; font-size: 20px; letter-spacing: -.6px; }
.request-sheet-header p { margin: 0; color: #65726e; font-size: 11px; line-height: 1.4; }
.request-sheet-header button { width: 36px; height: 36px; border: 0; border-radius: 50%; color: #1b211f; background: #f0f3f0; font-size: 21px; }
.request-status-pill { display: inline-flex; width: fit-content; padding: 4px 8px; border-radius: 999px; color: #6b4d0b; background: #fff6de; font-size: 9px; font-weight: 900; }
.request-status-pill.paid { color: #12624f; background: #e5f8f1; }
.request-status-pill.closed { color: #68716d; background: #eef1ee; }
.request-sheet-details { display: grid; gap: 8px; margin: 0 0 12px; padding: 12px; border-radius: 16px; background: #f8faf8; }
.request-sheet-details div { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; }
.request-sheet-details dt { color: #6f7a76; font-size: 10px; }
.request-sheet-details dd { min-width: 0; margin: 0; text-align: right; font-size: 11px; font-weight: 900; overflow-wrap: anywhere; }
.request-sheet-safety-note { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 9px; align-items: center; margin-top: 10px; padding: 11px; border-radius: 15px; color: #5e6d68; background: #f5f8f5; font-size: 10px; line-height: 1.4; }
.request-sheet-safety-note svg { width: 17px; }
@media (max-width: 560px) {
  .requests-mobile-screen { padding-bottom: 8px; }
  .requests-mobile-header { margin-bottom: 11px; }
  .requests-mobile-header h1 { font-size: 24px; }
  .requests-mobile-header p { font-size: 10px; }
  .requests-create-button { min-height: 36px; padding: 0 12px; font-size: 11px; }
  .requests-summary-card div { padding: 10px 9px; border-radius: 15px; }
  .requests-summary-card strong { font-size: 18px; }
  .request-compact-card { padding: 10px; border-radius: 17px; }
  .request-card-actions { margin-top: 9px; }
  .request-primary-action, .request-secondary-action { min-height: 36px; }
}
`

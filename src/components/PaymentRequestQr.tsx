import type { PaymentRequest } from '../types'
import { buildPaymentRequestQrPayload } from '../lib/qrPayload'

type QrSurfaceMode = 'api' | 'demo'

interface PaymentRequestQrProps {
  request: PaymentRequest
  identifier: string
  statusText: string
  mode?: QrSurfaceMode
}

const QR_SIZE = 21

function money(amount: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)
}

function seededHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function isFinderCell(row: number, column: number, originRow: number, originColumn: number) {
  const localRow = row - originRow
  const localColumn = column - originColumn
  if (localRow < 0 || localRow > 6 || localColumn < 0 || localColumn > 6) return null
  const edge = localRow === 0 || localRow === 6 || localColumn === 0 || localColumn === 6
  const center = localRow >= 2 && localRow <= 4 && localColumn >= 2 && localColumn <= 4
  return edge || center
}

function qrCells(payload: string) {
  const hash = seededHash(payload)
  return Array.from({ length: QR_SIZE * QR_SIZE }, (_, index) => {
    const row = Math.floor(index / QR_SIZE)
    const column = index % QR_SIZE
    const finder =
      isFinderCell(row, column, 0, 0) ??
      isFinderCell(row, column, 0, QR_SIZE - 7) ??
      isFinderCell(row, column, QR_SIZE - 7, 0)

    if (finder !== null) return finder
    const mixed = Math.imul(hash ^ (row * 97) ^ (column * 193) ^ (index * 389), 2654435761) >>> 0
    return mixed % 5 === 0 || mixed % 7 === 0 || mixed % 11 === 0
  })
}

export default function PaymentRequestQr({ request, identifier, statusText, mode = 'api' }: PaymentRequestQrProps) {
  const payload = buildPaymentRequestQrPayload(request.id)
  const cells = qrCells(payload)
  const warning = mode === 'demo'
    ? 'QR demo local. No mueve dinero real, no cobra y no confirma una solicitud.'
    : 'QR local de ionPAY V1. No es producción, no mueve dinero, no cobra y no confirma una solicitud.'

  return (
    <article className={`payment-request-qr ${mode}`} aria-label={`QR local informativo para solicitud pendiente ${request.reference}`}>
      <style>{styles}</style>
      <div className="payment-request-qr-code" aria-hidden="true">
        {cells.map((active, index) => <i key={index} className={active ? 'active' : undefined} />)}
      </div>
      <div className="payment-request-qr-copy">
        <span className="eyebrow">QR local ionPAY V1</span>
        <h3>QR informativo de solicitud</h3>
        <p className="payment-request-qr-context">Solicitud pendiente: todavía no es pago confirmado ni receipt/proof de actividad.</p>
        <dl>
          <div><dt>Monto</dt><dd>{money(request.amount)}</dd></div>
          <div><dt>Moneda</dt><dd>PEN</dd></div>
          <div><dt>Referencia</dt><dd>{request.reference}</dd></div>
          <div><dt>Identificador/IonTag</dt><dd>{identifier}</dd></div>
          <div><dt>Estado</dt><dd>{statusText}</dd></div>
        </dl>
        <p className="payment-request-qr-warning">{warning}</p>
        <p className="payment-request-qr-safety">
          No paga, no confirma cobro, no es comprobante bancario, no liquida saldo, no abre scanner, no pide cámara y no sale a una red externa.
        </p>
        <code>{payload}</code>
      </div>
    </article>
  )
}

const styles = `
.payment-request-qr {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 14px;
  margin: 0 2px 14px 57px;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid #dbe6e2;
  background: #f7fbf9;
  text-align: left;
}
.payment-request-qr.demo {
  border-color: #efd9a9;
  background: #fff8e8;
}
.payment-request-qr-code {
  width: 112px;
  height: 112px;
  display: grid;
  grid-template-columns: repeat(21, 1fr);
  grid-template-rows: repeat(21, 1fr);
  gap: 1px;
  padding: 8px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #d8e3de;
  box-shadow: 0 10px 20px rgba(23, 44, 38, .07);
}
.payment-request-qr-code i {
  border-radius: 1px;
  background: transparent;
}
.payment-request-qr-code i.active {
  background: #111817;
}
.payment-request-qr.demo .payment-request-qr-code i.active {
  background: #7b570d;
}
.payment-request-qr-copy {
  min-width: 0;
  display: grid;
  gap: 7px;
}
.payment-request-qr-copy h3 {
  margin: 0;
  font: 800 16px/1.15 'Manrope', system-ui, sans-serif;
  letter-spacing: -.35px;
}
.payment-request-qr-context {
  margin: 0;
  color: #52605c;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.45;
}
.payment-request-qr-copy dl {
  display: grid;
  gap: 5px;
  margin: 0;
}
.payment-request-qr-copy dl div {
  display: grid;
  grid-template-columns: minmax(86px, .72fr) minmax(0, 1.28fr);
  gap: 10px;
  align-items: start;
}
.payment-request-qr-copy dt {
  color: #687370;
  font-size: 10px;
}
.payment-request-qr-copy dd {
  min-width: 0;
  margin: 0;
  color: #17211f;
  font-size: 11px;
  font-weight: 800;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: right;
}
.payment-request-qr-warning,
.payment-request-qr-safety {
  margin: 0;
  line-height: 1.45;
  font-size: 10px;
}
.payment-request-qr-warning {
  color: #254f49;
  font-weight: 900;
}
.payment-request-qr.demo .payment-request-qr-warning {
  color: #7b570d;
}
.payment-request-qr-safety {
  color: #687370;
}
.payment-request-qr code {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 6px 8px;
  border-radius: 10px;
  color: #52605c;
  background: rgba(255,255,255,.8);
  border: 1px solid rgba(0,0,0,.05);
  font-size: 9px;
}
@media (max-width: 560px) {
  .payment-request-qr {
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 11px;
    margin: 0 0 13px 0;
    padding: 12px;
    border-radius: 16px;
  }
  .payment-request-qr-code {
    width: 96px;
    height: 96px;
    padding: 7px;
  }
  .payment-request-qr-copy h3 {
    font-size: 14px;
  }
  .payment-request-qr-copy dl div {
    grid-template-columns: minmax(70px, .7fr) minmax(0, 1.3fr);
    gap: 8px;
  }
  .payment-request-qr-copy dt,
  .payment-request-qr-copy dd,
  .payment-request-qr-context,
  .payment-request-qr-warning,
  .payment-request-qr-safety {
    font-size: 9px;
  }
}
@media (max-width: 390px) {
  .payment-request-qr {
    grid-template-columns: 88px minmax(0, 1fr);
  }
  .payment-request-qr-code {
    width: 88px;
    height: 88px;
  }
}
`

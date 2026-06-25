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
    ? 'QR demo local: no mueve dinero real.'
    : 'QR local V1: no producción, no mueve dinero.'

  return (
    <article className={`payment-request-qr ${mode}`} aria-label={`QR local informativo para solicitud pendiente ${request.reference}`}>
      <style>{styles}</style>
      <div className="payment-request-qr-code" aria-hidden="true">
        {cells.map((active, index) => <i key={index} className={active ? 'active' : undefined} />)}
      </div>
      <div className="payment-request-qr-copy">
        <span className="eyebrow">QR local</span>
        <h3>Solicitud informativa</h3>
        <dl>
          <div><dt>Monto</dt><dd>{money(request.amount)}</dd></div>
          <div><dt>Moneda</dt><dd>PEN</dd></div>
          <div><dt>Referencia</dt><dd>{request.reference}</dd></div>
          <div><dt>IonTag</dt><dd>{identifier}</dd></div>
          <div><dt>Estado</dt><dd>{statusText}</dd></div>
        </dl>
        <p className="payment-request-qr-warning">{warning}</p>
        <p className="payment-request-qr-safety">
          No paga, no confirma cobro, no es comprobante bancario, no liquida saldo, no abre scanner/cámara y no usa red externa.
        </p>
        <code>{payload}</code>
      </div>
    </article>
  )
}

const styles = `
.payment-request-qr {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 12px;
  margin: 0 2px 12px 0;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid #dbe6e2;
  background: #f7fbf9;
  text-align: left;
}
.payment-request-qr.demo {
  border-color: #efd9a9;
  background: #fff8e8;
}
.payment-request-qr-code {
  width: 100px;
  height: 100px;
  display: grid;
  grid-template-columns: repeat(21, 1fr);
  grid-template-rows: repeat(21, 1fr);
  gap: 1px;
  padding: 7px;
  border-radius: 13px;
  background: #ffffff;
  border: 1px solid #d8e3de;
  box-shadow: 0 8px 16px rgba(23, 44, 38, .06);
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
  gap: 5px;
}
.payment-request-qr-copy h3 {
  margin: 0;
  font: 800 14px/1.1 'Manrope', system-ui, sans-serif;
  letter-spacing: -.3px;
}
.payment-request-qr-copy dl {
  display: grid;
  gap: 4px;
  margin: 0;
}
.payment-request-qr-copy dl div {
  display: grid;
  grid-template-columns: minmax(70px, .68fr) minmax(0, 1.32fr);
  gap: 8px;
  align-items: start;
}
.payment-request-qr-copy dt {
  color: #687370;
  font-size: 9.5px;
}
.payment-request-qr-copy dd {
  min-width: 0;
  margin: 0;
  color: #17211f;
  font-size: 10px;
  font-weight: 800;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: right;
}
.payment-request-qr-warning,
.payment-request-qr-safety {
  margin: 0;
  line-height: 1.35;
  font-size: 9.5px;
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
  padding: 5px 7px;
  border-radius: 9px;
  color: #52605c;
  background: rgba(255,255,255,.8);
  border: 1px solid rgba(0,0,0,.05);
  font-size: 8.5px;
}
@media (max-width: 560px) {
  .payment-request-qr {
    grid-template-columns: 82px minmax(0, 1fr);
    gap: 8px;
    margin: 0 0 9px 0;
    padding: 9px;
    border-radius: 14px;
  }
  .payment-request-qr-code {
    width: 82px;
    height: 82px;
    padding: 6px;
    border-radius: 11px;
  }
  .payment-request-qr-copy {
    gap: 4px;
  }
  .payment-request-qr-copy h3 {
    font-size: 12px;
  }
  .payment-request-qr-copy dl {
    gap: 3px;
  }
  .payment-request-qr-copy dl div {
    grid-template-columns: minmax(54px, .62fr) minmax(0, 1.38fr);
    gap: 6px;
  }
  .payment-request-qr-copy dt,
  .payment-request-qr-copy dd,
  .payment-request-qr-warning,
  .payment-request-qr-safety {
    font-size: 8.5px;
  }
}
@media (max-width: 390px) {
  .payment-request-qr {
    grid-template-columns: 74px minmax(0, 1fr);
    padding: 8px;
  }
  .payment-request-qr-code {
    width: 74px;
    height: 74px;
    padding: 5px;
  }
}
`

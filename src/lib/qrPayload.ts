export function buildPaymentRequestQrPayload(requestId: string) {
  return `ionpay-local-request:${requestId}`
}

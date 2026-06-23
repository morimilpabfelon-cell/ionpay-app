const MAX_SAFE_MINOR = BigInt(Number.MAX_SAFE_INTEGER)

export class MoneyError extends Error {
  constructor(message) {
    super(message)
    this.code = 'INVALID_AMOUNT'
  }
}

export function parseDecimalMinor(value, currency = 'PEN') {
  if (typeof value !== 'string') {
    throw new MoneyError(`El monto en ${currency} debe enviarse como texto decimal.`)
  }

  const normalized = value.trim()
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) {
    throw new MoneyError(`El monto en ${currency} debe ser un decimal positivo con máximo dos decimales.`)
  }

  const whole = match[1].replace(/^0+(?=\d)/, '')
  const fraction = (match[2] ?? '').padEnd(2, '0')
  if (whole.length > 14) {
    throw new MoneyError('El monto es demasiado grande.')
  }

  const minor = BigInt(whole) * 100n + BigInt(fraction || '0')
  if (minor === 0n) throw new MoneyError('El monto debe ser mayor que cero.')
  if (minor > MAX_SAFE_MINOR) throw new MoneyError('El monto es demasiado grande.')

  return Number(minor)
}

export function parsePenMinor(value) {
  return parseDecimalMinor(value, 'PEN')
}

export function multiplyDivideMinor(amount, numerator, denominator) {
  if (![amount, numerator, denominator].every(Number.isSafeInteger) || amount <= 0 || numerator <= 0 || denominator <= 0) {
    throw new MoneyError('No se pudo calcular el monto de destino.')
  }

  const divisor = BigInt(denominator)
  const result = (BigInt(amount) * BigInt(numerator) + divisor / 2n) / divisor
  if (result === 0n) throw new MoneyError('El monto es demasiado pequeño para convertirlo.')
  if (result > MAX_SAFE_MINOR) throw new MoneyError('El monto calculado es demasiado grande.')

  return Number(result)
}

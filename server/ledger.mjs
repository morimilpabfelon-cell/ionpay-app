import { randomUUID } from 'node:crypto'

export class LedgerError extends Error {
  constructor(message, code = 'LEDGER_ERROR') {
    super(message)
    this.code = code
  }
}

export function createLedger(db) {
  const accountById = db.prepare('SELECT * FROM accounts WHERE id = ?')
  const insertTransaction = db.prepare(`INSERT INTO ledger_transactions (id, type, status, reference, metadata_json, created_at) VALUES (?, ?, 'COMPLETED', ?, ?, ?)`)
  const insertEntry = db.prepare(`INSERT INTO ledger_entries (id, transaction_id, account_id, currency, amount, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
  const updateBalance = db.prepare('UPDATE accounts SET balance = ? WHERE id = ?')

  function postEntries({ type, reference, entries, metadata = {} }) {
    if (!Array.isArray(entries) || entries.length < 2) throw new LedgerError('Una operación requiere al menos dos asientos.')

    // Validate currencies early
    const validCurrencies = new Set(['PEN', 'USDT'])
    for (const entry of entries) {
      if (!validCurrencies.has(entry.currency)) {
        throw new LedgerError(`Moneda ${entry.currency} no válida.`)
      }
    }

    const grouped = new Map()
    for (const entry of entries) {
      if (!Number.isSafeInteger(entry.amount) || entry.amount === 0) throw new LedgerError('Monto contable inválido.')
      if (typeof entry.accountId !== 'string' || !entry.accountId || typeof entry.currency !== 'string' || !entry.currency) {
        throw new LedgerError('Asiento contable inválido.')
      }
      const key = `${entry.accountId}\u0000${entry.currency}`
      const amount = (grouped.get(key)?.amount ?? 0) + entry.amount
      if (!Number.isSafeInteger(amount)) throw new LedgerError('El delta contable excede el rango seguro.')
      grouped.set(key, { accountId: entry.accountId, currency: entry.currency, amount })
    }

    const consolidated = [...grouped.values()].filter((entry) => entry.amount !== 0)
    if (consolidated.length < 2) throw new LedgerError('Una operación requiere al menos dos deltas contables efectivos.')

    const sums = new Map()
    for (const entry of consolidated) sums.set(entry.currency, (sums.get(entry.currency) ?? 0n) + BigInt(entry.amount))
    for (const [currency, sum] of sums) {
      if (sum !== 0n) throw new LedgerError(`La operación no cuadra para ${currency}.`, 'UNBALANCED_LEDGER')
    }

    const transactionId = randomUUID()
    const createdAt = new Date().toISOString()

    const resolved = consolidated.map((entry) => {
      const account = accountById.get(entry.accountId)
      if (!account) throw new LedgerError('Cuenta contable no encontrada.', 'ACCOUNT_NOT_FOUND')
      if (account.currency !== entry.currency) throw new LedgerError('La moneda no corresponde a la cuenta.')
      if (!Number.isSafeInteger(account.balance)) throw new LedgerError('Saldo contable fuera del rango seguro.')
      const nextBalance = account.balance + entry.amount
      if (!Number.isSafeInteger(nextBalance)) throw new LedgerError('El saldo contable excede el rango seguro.')
      
      // CRITICAL FIX: Validate SYSTEM account balance
      // Prevents treasury accounts from going negative
      if (account.owner_type === 'SYSTEM' && nextBalance < 0) {
        throw new LedgerError(`Tesorería ${entry.currency} insuficiente.`, 'TREASURY_INSUFFICIENT')
      }
      if (account.owner_type === 'USER' && nextBalance < 0) throw new LedgerError('Saldo insuficiente.', 'INSUFFICIENT_FUNDS')
      
      return { entry, account, nextBalance }
    })

    insertTransaction.run(transactionId, type, reference, JSON.stringify(metadata), createdAt)
    for (const item of resolved) {
      updateBalance.run(item.nextBalance, item.account.id)
      insertEntry.run(randomUUID(), transactionId, item.account.id, item.entry.currency, item.entry.amount, createdAt)
    }
    return { id: transactionId, reference, status: 'COMPLETED', createdAt }
  }

  function post(operation) {
    db.exec('BEGIN IMMEDIATE')
    try {
      const transaction = postEntries(operation)
      db.exec('COMMIT')
      return transaction
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  function postWithinTransaction(operation) {
    if (!db.isTransaction) throw new LedgerError('La operación contable requiere una transacción activa.', 'TRANSACTION_REQUIRED')
    return postEntries(operation)
  }

  return { post, postWithinTransaction }
}

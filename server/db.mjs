import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

export function createDatabase(dbPath = 'data/ionpay.db') {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true })

  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      alias TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      kyc_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('USER', 'SYSTEM')),
      owner_id TEXT NOT NULL,
      currency TEXT NOT NULL CHECK (currency IN ('PEN', 'USDT')),
      kind TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(owner_type, owner_id, currency, kind)
    );

    CREATE TABLE IF NOT EXISTS ledger_transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES ledger_transactions(id),
      account_id TEXT NOT NULL REFERENCES accounts(id),
      currency TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount != 0),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_records (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      idempotency_key TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      response_json TEXT NOT NULL,
      transaction_id TEXT REFERENCES ledger_transactions(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(owner_id, idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      requester_user_id TEXT NOT NULL REFERENCES users(id),
      payer_user_id TEXT NOT NULL REFERENCES users(id),
      currency TEXT NOT NULL CHECK (currency = 'PEN'),
      amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED')),
      reference TEXT NOT NULL UNIQUE,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      paid_at TEXT,
      cancelled_at TEXT,
      expired_at TEXT,
      paid_transaction_id TEXT REFERENCES ledger_transactions(id),
      CHECK (requester_user_id != payer_user_id),
      CHECK (
        (status = 'PENDING' AND paid_at IS NULL AND cancelled_at IS NULL AND expired_at IS NULL AND paid_transaction_id IS NULL)
        OR (status = 'PAID' AND paid_at IS NOT NULL AND cancelled_at IS NULL AND expired_at IS NULL AND paid_transaction_id IS NOT NULL)
        OR (status = 'CANCELLED' AND paid_at IS NULL AND cancelled_at IS NOT NULL AND expired_at IS NULL AND paid_transaction_id IS NULL)
        OR (status = 'EXPIRED' AND paid_at IS NULL AND cancelled_at IS NULL AND expired_at IS NOT NULL AND paid_transaction_id IS NULL)
      )
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_entries_transaction ON ledger_entries(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_entries_account ON ledger_entries(account_id);
    CREATE INDEX IF NOT EXISTS idx_idempotency_transaction ON idempotency_records(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_user_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_payment_requests_payer ON payment_requests(payer_user_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_payment_requests_expiry ON payment_requests(status, expires_at);
  `)

  const now = new Date().toISOString()
  const insertSystem = db.prepare(`
    INSERT OR IGNORE INTO accounts
      (id, owner_type, owner_id, currency, kind, balance, created_at)
    VALUES (?, 'SYSTEM', 'IONPAY', ?, 'TREASURY', ?, ?)
  `)
  insertSystem.run(randomUUID(), 'PEN', 100_000_000_00, now)
  insertSystem.run(randomUUID(), 'USDT', 100_000_000_00, now)

  return db
}

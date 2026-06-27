# IONPAY

IONPAY es una billetera financiera y plataforma de pagos del ecosistema Ion. El producto debe funcionar en **Android e iOS**.

La prioridad vigente ya no es seguir puliendo una demo visual. La demo visual actual es suficiente por ahora. La prioridad es construir el **software core real**: wallet, ledger, payment core, sandbox provider, gates de riesgo, settlement, reconciliation, receipts, auditoría, observabilidad y pruebas.

Las funciones de dinero real permanecen deshabilitadas hasta aprobación explícita del fundador y gates técnicos, financieros, regulatorios y de compliance.

## Fuente operativa

La fuente operativa para agentes dentro del repositorio es [`AGENTS.md`](./AGENTS.md). Este README resume el estado para revisión rápida y onboarding técnico.

La memoria externa obligatoria es:

```text
morimilpabfelon-cell/ionpay-ops-memory
```

Doctrina operativa obligatoria para agentes:

```text
ionpay-ops-memory/AGENT_OPERATING_STANDARD.md
```

Todo agente debe operar con:

```text
Prompt + Loop + Output Contract + Stop Conditions
```

No se acepta un agente que opere solo con prompt de rol.

## Estado operativo actual

```text
V1 RC FREEZE / INTERNAL RC SIGN-OFF PASSED
```

Prioridad estratégica:

```text
PAYMENT CORE ARCHITECTURE / REAL SOFTWARE CORE FIRST
```

Active implementation item:

```text
Issue #33 — Codebase Zero Audit & Payment Core Baseline
state: open
classification: Audit / architecture / payment-core baseline
implementation status: audit and routing only
```

Issue #32 permanece abierto como blueprint de ecosistema. Issue #33 es la auditoría práctica antes de nuevas capas.

Issue #30 / PR #31 quedan pausados operativamente mientras Issue #33 define el baseline.

No hay producción pública. No hay dinero real. No hay release público autorizado.

## Issue #33 review queue

```text
Product Architect: completed / persisted
Software Architect: completed / persisted
Financial Safety Reviewer: completed / persisted
Security / API Reviewer: completed / persisted
Mobile Platform Reviewer: completed / persisted
Testing / QA Reviewer: pending
Scope Guardian: pending
Founder decision: pending
```

## Plataformas objetivo

IONPAY debe diseñarse para:

```text
Android
iOS
```

Estrategia actual:

```text
Frontend: React + TypeScript + Vite
Mobile container: Capacitor
Android: proyecto nativo actual en android/
iOS: plataforma objetivo futura; no se activa trabajo nativo iOS sin issue/gate separado
Backend local: Node.js
Database: SQLite
Ledger: doble entrada con montos enteros
```

Reglas de plataforma:

- El payment core debe ser independiente de Android/iOS.
- La lógica financiera vive en backend/core, no en código nativo mobile.
- Las diferencias de Android/iOS deben aislarse con platform adapters.
- Cualquier cambio nativo Android/iOS, Capacitor, permisos, deep links, biometría, cámara, notificaciones o distribución requiere issue separado, Mobile Platform Reviewer y Founder approval.

## Core requerido

Issue #33 audita y futuros issues solo podrán implementar por gates separados:

```text
Wallet Core
Ledger Core
PaymentIntent / Payment Core
PaymentRail Interface
ProviderAdapter Interface
Sandbox Provider
Internal P2P Payments
Payment Requests / Cobros
Merchant Core boundary
QR Payments future boundary
Checkout/Gateway future boundary
Payouts future boundary
Cards future boundary
Bank Transfers future boundary
Crypto/Public USDT future boundary
KYC/KYB Gate Model
AML/Sanctions Gate Model
Risk/Fraud Gate Model
Limits Engine
Idempotency Engine
Webhook/Event Inbox
Settlement Engine
Reconciliation Engine
Refund/Reversal/Dispute Model
Receipt/Proof Model
Feature Flags / Module Enablement
Audit Logs
Observability
Testing Matrix
Operational Readiness Gates
Android Platform Adapter boundary
iOS Platform Adapter boundary
```

## Testing requerido

Antes de una nueva demo del core, el software debe demostrar:

```text
send/receive correcto
saldo insuficiente bloqueado
destinatario inválido bloqueado
idempotency contra duplicados
protección contra doble gasto
provider timeout simulado
provider failure simulado
webhook duplicado simulado
webhook fuera de orden simulado
ledger balanceado
no negative user balance
refund/reversal/dispute simulado
settlement correcto
reconciliation match
reconciliation mismatch detectado
risk/limits denial
KYC/KYB blocked state
feature flag disabled state
receipt solo con estado confirmado
no real money movement
no production claim
Android build/sync safety
iOS readiness cuando iOS se abra formalmente
```

## Ejecutar el proyecto

Instalar dependencias:

```bash
pnpm install
```

Ejecutar frontend:

```bash
pnpm dev
```

Ejecutar API local:

```bash
pnpm api
```

API local esperada:

```text
http://127.0.0.1:8787
```

## Validación requerida

```powershell
./scripts/pre-pr-check.ps1
```

```bash
pnpm build
pnpm api:test
pnpm android:sync
git diff --check
```

Cuando iOS se abra formalmente, se definirá validación iOS equivalente antes de cualquier cambio nativo.

## Hard boundary

Bloqueado salvo issue separado, gate fresco y Founder approval:

```text
production
real money
public release
banking/regulatory approval
real bank transfers
real card issuing/acquiring
real checkout/gateway
real payouts
real QR payments
real crypto/USDT public surface
external provider activation
KYC/KYB vendor integration
AML live screening
ledger mutation
DB/schema changes
backend implementation beyond approved issue
frontend implementation beyond approved issue
package/lockfile changes
native Android/iOS changes
Apple Pay / Google Pay activation
app store distribution
new feature scope
```

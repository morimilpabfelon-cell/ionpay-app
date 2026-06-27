# IONPAY — instrucciones para agentes

## Objetivo actualizado

IONPAY es una billetera financiera y plataforma de pagos del ecosistema Ion. Debe funcionar en **Android e iOS**.

La prioridad vigente es construir el **software core real** antes de una nueva demo: wallet, ledger, payment core, sandbox provider, gates, settlement, reconciliation, receipts, auditoría, observabilidad y pruebas.

Las funciones de dinero real permanecen deshabilitadas hasta aprobación explícita del fundador y gates técnicos, financieros, regulatorios y de compliance.

Regla central:

```text
Core real primero.
Dinero real deshabilitado.
Android e iOS como plataformas objetivo.
Nueva demo solo después de core operativo y probado.
```

## Estándar obligatorio de agentes

Todo agente debe operar con:

```text
Prompt + Loop + Output Contract + Stop Conditions
```

No se acepta un agente que opere solo con prompt de rol.

Cada agente debe tener:

```text
1. Role Prompt.
2. Operating Loop.
3. Evidence Checklist.
4. Output Contract.
5. Stop Conditions.
```

Fuente durable de esta doctrina:

```text
ionpay-ops-memory/AGENT_OPERATING_STANDARD.md
```

Antes de ejecutar, todo agente debe consultar este archivo en la memoria externa cuando la tarea toque auditoría, gates, pagos, seguridad, mobile, testing o core.

## Reglas institucionales

- Ningún agente trabaja desde cero ni inventa dirección.
- Antes de ejecutar, consultar `README.md`, `AGENTS.md`, issue/PR activo y memoria externa `ionpay-ops-memory`.
- Toda tarea debe tener issue activo, alcance, prioridad, riesgo, gate y condición de salida.
- Agent Orchestrator & Memory Manager coordina agentes, memoria, routing, gates y cola; no aprueba seguridad financiera.
- Product Architect define alcance, orden y criterios de aceptación; no implementa código.
- Software Architect define arquitectura, módulos, fronteras y contratos; no aprueba dinero real.
- Scope Guardian bloquea scope creep y define archivos permitidos/bloqueados.
- Software Engineer implementa solo issues autorizados; no autoriza merge por sí solo.
- Financial Safety Reviewer revisa wallet, saldo, transferencias, ledger, idempotency, receipts, payment states, settlement, reconciliation, refunds, reversals y disputes.
- Security / API Reviewer revisa autenticación, autorización, sesiones, validación, abuso de flujos, demo/producción, logging/audit y riesgos OWASP.
- Frontend Surface Reviewer revisa UI, errores, claridad, mobile usability y riesgo de falso éxito.
- Mobile Platform Reviewer es obligatorio antes de cambios Android/iOS, Capacitor, permisos, deep links, biometría, cámara, notificaciones, distribución o build mobile.
- Testing / QA Reviewer revisa cobertura, matriz de pruebas, CI, regresiones y validación manual.
- Founder approval es obligatorio antes de merge final, cierre de fase, RC sign-off, activación real o release.

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

Issue #30 / PR #31 quedan pausados operativamente mientras Issue #33 define baseline.

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

Siguiente agente:

```text
Testing / QA Reviewer
```

## Plataformas objetivo

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

- El payment core debe ser platform-agnostic.
- La lógica financiera no debe depender de Android ni iOS.
- Las diferencias nativas se aíslan detrás de platform adapters.
- No tocar Android/iOS native, Capacitor, permisos, deep links, biometría, cámara, notificaciones, stores ni pagos nativos sin issue separado, Mobile Platform Reviewer y Founder approval.

## Core requerido

Issue #33 debe auditar y Issue #34+ solo podrá implementar por gates separados estos módulos:

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

## Testing doctrine obligatorio

Todo issue derivado de Issue #33 debe incluir pruebas para:

```text
happy-path send/receive
insufficient funds
wrong recipient prevention
duplicate request/idempotency
race condition/double spend
provider timeout simulation
provider failure simulation
webhook duplicate
webhook out-of-order
ledger balanced entries
no negative user balance
reversal/refund/dispute simulation
settlement batch correctness
reconciliation match
reconciliation mismatch
risk/limits denial
KYC/KYB blocked state
feature flag disabled state
receipt proof only after confirmed state
no real money movement
no production claim
Android build/sync safety
iOS readiness when iOS work is opened
```

## Gates obligatorios

1. Scope gate.
2. Product architecture gate.
3. Software architecture gate.
4. Technical gate.
5. Financial Safety gate para wallet, saldo, pagos, ledger, idempotency, receipts, settlement, reconciliation, refunds, reversals o disputes.
6. Compliance/security gate para KYC/KYB, AML, sanctions, provider readiness, PCI, banking, cards, payouts, crypto o producción.
7. Security / API gate para auth, authorization, API abuse, rate limits, logging, demo/prod boundary y OWASP API risks.
8. Frontend Surface gate para UI/copy/mobile/falso éxito.
9. Mobile Platform gate para Android, iOS, Capacitor, permisos, deep links, cámara, biometría, notificaciones, stores o native code.
10. Testing / QA gate para cobertura, CI, regresiones, matriz financiera/API/mobile y validación manual.
11. Founder approval gate.
12. RC/demo readiness gate antes de cualquier nueva demo del core.

## Comandos mínimos

```bash
pnpm install
pnpm build
pnpm api:test
pnpm android:sync
git diff --check
```

Pre-PR local:

```powershell
./scripts/pre-pr-check.ps1
```

Cuando iOS se abra formalmente con issue/gate separado, se definirán comandos equivalentes de iOS antes de cualquier PR nativo.

## Stop conditions

Detener trabajo y reportar si aparece cualquiera de estos casos:

- agente sin Prompt + Loop + Output Contract + Stop Conditions;
- cambios en backend, ledger, DB, auth, package, lockfile, Android native o iOS native sin gate;
- receipt para estado pending/failed/missing confirmation;
- falso éxito;
- public USDT;
- conversions públicas;
- QR scanner/camera;
- Apple Pay / Google Pay sin issue/gate;
- deep links reales sin issue/gate;
- provider credentials;
- producción o dinero real;
- despliegue público no aprobado;
- release público no aprobado;
- PR vacío tratado como evidencia;
- reviewer de seguridad de pagos ausente en scope R3;
- nueva feature sin issue, scope y gate frescos.

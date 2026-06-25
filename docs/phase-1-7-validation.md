# Phase 1.7 Validation Record — Basic QR display for payment requests

Status: **VALIDATED + REVIEWED + FOUNDER-AUTHORIZED PHASE CLOSURE**

Date: 2026-06-25

## Scope

Phase 1.7 delivered a frontend-only basic QR display for existing payment requests.

The QR surface is local/non-production and is limited to payment requests with `request.status === 'PENDING'`.

## Explicit restrictions

This closure does **not** authorize:

- production release;
- real money;
- scanner;
- camera permissions;
- automatic QR payment;
- real deep links;
- public external links;
- backend changes;
- ledger changes;
- balance mutation changes;
- DB/schema/migrations;
- idempotency changes;
- banking integrations;
- wallet external integrations;
- blockchain;
- public USDT;
- conversions;
- Android/iOS native changes.

## Relevant commits

```text
7b0fe9a475ad992fe967751f01d576338572b353
Add local payment request QR payload helper

61bb8a89aab603cf87138aa59f090697ec2324b5
Add frontend local payment request QR display

640ef32abaf287b2458dfe33378532828498395b
Show local QR for payment requests

83e8156d8870b0f37d4dec98d6044dd6fbc9adde
Restrict payment request QR to pending status
```

## Files changed in Phase 1.7

Modified:

```text
src/components/ServicesPage.tsx
```

Added:

```text
src/components/PaymentRequestQr.tsx
src/lib/qrPayload.ts
```

No blocked files were intentionally changed for Phase 1.7.

## Implemented behavior

- `buildPaymentRequestQrPayload(requestId)` returns a local inert payload:

```text
ionpay-local-request:<requestId>
```

- `PaymentRequestQr` renders a local QR-like visual surface.
- The QR appears only for `PENDING` payment requests.
- The QR does not execute payment behavior.
- The QR does not call backend APIs.
- The QR is not a URL or real deep link.
- The QR does not open scanner or camera.
- The QR displays:
  - amount;
  - PEN currency;
  - reference;
  - identifier / IonTag;
  - status;
  - local/non-production warning;
  - safety copy.

## Required safety copy

The QR surface includes the following meaning:

```text
QR local de ionPAY V1. No es producción. No mueve dinero por sí mismo.
```

It also states that the QR does not pay, does not confirm collection, is not a bank receipt, does not settle balance, does not open scanner, does not request camera, and does not go to an external network.

## Gates completed

### Scope Guardian

Verdict: **APPROVED WITH CONDITIONS**

Phase 1.7 was approved as frontend-only basic QR display for existing payment requests, without scanner, camera, real deep links, backend, ledger, production, or real money.

### Founder scope approval

Founder approved implementation with explicit restrictions:

```text
Apruebo el Scope Guardian output de Phase 1.7.
Autorizo iniciar implementación frontend-only de Basic QR display para payment requests existentes.
No autorizo scanner, cámara, pago automático, deep links reales, backend, ledger, producción ni dinero real.
```

### Financial Safety Reviewer / Security & Ledger Auditor

Verdict: **APPROVED WITH CONDITIONS**

R3 found no direct ledger/backend/money-movement risk in the reviewed QR code path, but identified medium visible financial interpretation risk.

Required hardening:

```text
Show QR only for PENDING payment requests.
```

Hardening applied in commit:

```text
83e8156d8870b0f37d4dec98d6044dd6fbc9adde
Restrict payment request QR to pending status
```

### Frontend Surface Reviewer

Verdict: **APPROVED WITH CONDITIONS**

No frontend blocking findings remained after the hardening commit. Conditions before closure were local validation, mobile validation, founder approval, and documentation.

### Local validation

Executed by founder/operator on Windows local repo:

```text
git pull --ff-only: PASS / Already up to date
pnpm install --frozen-lockfile: PASS
pnpm build: PASS
pnpm api:test: PASS 22/22
pnpm android:sync: PASS
git diff --check: PASS with non-blocking Android CRLF warnings
git status: PASS / working tree clean
```

Notes:

```text
git diff --check produced Android CRLF warnings only:
- android/app/capacitor.build.gradle
- android/capacitor.settings.gradle
```

`git status` confirmed:

```text
nothing to commit, working tree clean
```

### Human mobile validation

Founder confirmed human mobile validation PASS.

The following were treated as PASS by founder confirmation:

```text
QR no se desborda
Fila de solicitud + Pagar/Cancelar no rompe layout
QR se entiende como informativo, no botón de pago
Safety copy visible
QR solo aparece en solicitudes PENDING
QR no aparece en PAID/CANCELLED/EXPIRED
No scanner/cámara/deep link
No USDT/conversions
Demo no se presenta como dinero real
```

### Founder final closure approval

Founder explicitly approved final closure:

```text
Apruebo el cierre final de Phase 1.7.
Confirmo validación humana mobile PASS.
No autorizo producción, dinero real, scanner, cámara, backend, ledger ni deep links reales.
Autorizo documentar el cierre como VALIDATED + REVIEWED + FOUNDER-AUTHORIZED PHASE CLOSURE.
```

## Final closure decision

Phase 1.7 is closed as:

```text
VALIDATED + REVIEWED + FOUNDER-AUTHORIZED PHASE CLOSURE
```

## Post-closure restrictions

Future phases remain blocked from the following without a new Scope Guardian gate and required reviewers:

- scanner/camera QR;
- QR payment execution;
- real payment links;
- production release;
- real money;
- backend financial changes;
- ledger changes;
- DB/schema/migrations;
- idempotency changes;
- external banking/wallet integrations;
- Android/iOS native changes;
- public USDT/conversions;
- commerce mode expansion.

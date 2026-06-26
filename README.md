# IONPAY

IONPAY es una billetera financiera Android-first construida de forma incremental. El objetivo no es desarrollar todos los módulos al mismo tiempo, sino consolidar primero el núcleo seguro de cuenta, wallet, ledger, transferencias, cobros y trazabilidad; después integrar la interfaz; luego validar Android; y solo más adelante evaluar producción bajo autorización separada.

La fuente operativa para agentes dentro del repositorio es [`AGENTS.md`](./AGENTS.md). Este README resume el estado del proyecto para revisión rápida y onboarding técnico.

## Principio de desarrollo

IONPAY se desarrolla por fases pequeñas, verificables y revisables.

Regla central:

- una fase o gap activo;
- una frontera de alcance;
- una PR pequeña cuando aplique;
- una validación clara;
- reviewer obligatorio cuando hay riesgo financiero;
- ningún merge final, cierre de fase, release candidate sign-off o release sin autorización humana explícita.

## Estado operativo actual

### Estado de control

Estado actual: **V1 RC FREEZE**.

Active implementation item: **none**.

No hay producción pública.

No hay dinero real.

No hay release público autorizado.

Issue #26 está **closed / completed** con decisión final: **A — ENTER V1 RC FREEZE**.

Este estado congela alcance y gates. No autoriza implementación, producción, dinero real ni release público.

### Última decisión de control

- **Issue #26 — P0 V1 Release Candidate Freeze Plan**.
- Estado: **closed / completed**.
- Decisión final: **A — ENTER V1 RC FREEZE**.
- Tipo: planning / readiness / gates.
- Implementación: ninguna.
- Código autorizado: no.
- Feature autorizada: no.
- Producción autorizada: no.
- Dinero real autorizado: no.
- Release público autorizado: no.

Gates humanos registrados:

- Product Architect: **ENTER V1 RC FREEZE**.
- Scope Guardian: **APPROVED FOR RC FREEZE SCOPE**.
- Financial Safety Reviewer: **APPROVED FOR RC FREEZE FINANCIAL SAFETY**.
- Frontend Surface Reviewer: **APPROVED FOR RC FREEZE FRONTEND SURFACE**.
- Founder: **APPROVED FOR RC FREEZE**.

### Clasificación Demo / Error / Loading / Empty states

P1 antes de cualquier RC sign-off final si afecta:

- confianza;
- pago;
- saldo;
- receipt;
- distinción demo/API;
- falso éxito;
- ambigüedad de loading;
- ambigüedad de error;
- claridad operativa.

P2 después de RC solo si es polish cosmético y no afecta interpretación transaccional, proof de receipt/activity, claridad de pago/saldo, claridad demo/API ni scope V1.

### Reconciliaciones cerradas

- Issue #10: **closed / completed**. Cierre administrativo con PR #11 como evidencia principal de Phase 1.3B — V1 Product Surface Lock.
- Issue #20: **closed / completed**. Receipt Proof Hardening implementado por PR #24.
- Issue #26: **closed / completed**. V1 RC Freeze Plan completado.
- PR #22: closed / not merged. No usar como evidencia de implementación.
- PR #23: closed / not merged. Superseded por PR #24. No usar como evidencia de implementación.
- PR #24: closed / merged. Fuente de verdad para Issue #20.
- PR #25: closed / merged. Fuente de verdad para automation gates.

### Última mejora de producto cerrada

- **Issue #20 — Receipt Proof Hardening: explicit confirmed-activity gate**.
- Estado: **closed / completed**.
- Implementación: PR #24.
- Branch: `issue-20-proof-gate`.
- Reviewed head SHA: `115cd2a45dab98a937008d0d7f1dc4952b09a1c3`.
- Squash merge SHA: `01d0a5aa9cf41b34b177bded26f93209080f0fc2`.
- Archivos modificados:
  - `src/App.tsx`;
  - `src/lib/api.ts`;
  - `src/types.ts`;
  - `src/styles.css`.

Resultado implementado:

- receipt opening queda detrás de actividad PEN completada;
- API-mode receipts requieren metadata de prueba API/backend;
- pending, failed, missing-confirmation, unavailable, non-PEN y local-only API states no pueden abrir comprobantes;
- demo receipts quedan claramente simulados;
- UI de comprobante no disponible queda visible y no clickable.

### Automatización operativa instalada

- PR: **#25 — Add operational automation gates**.
- Estado: **closed / merged**.
- Merge SHA: `fba68e68436ede6030c4228e70e9c6989aa6b398`.
- Archivos instalados:
  - `.github/workflows/validate.yml`;
  - `.github/pull_request_template.md`;
  - `scripts/pre-pr-check.ps1`.

La automatización refuerza gates. No aprueba seguridad financiera, ledger, producción, dinero real, release público ni scope de producto.

## Fases completadas / documentadas

- Phase 0.1 — Agent Operating System.
- Phase 1.1A — Onboarding structure.
- Phase 1.1B — V1 Scope Lock UI.
- Phase 1.2A — Financial Core Hardening.
- Phase 1.2B — Backend V1 Surface Lock.
- Phase 1.2C — Idempotency & Retry Safety.
- Phase 1.3A — Payment Requests Foundation.
- Phase 1.3B — V1 Product Surface Lock, implemented by PR #11 and administratively closed through Issue #10.
- Phase 1.4 — Account, Wallet & Single Fiat Balance.
- Phase 1.5 — Frontend API Integration for Transfers and Payment Requests.
- Phase 1.8 / 1.8B — Payment Requests UX + Activity/Receipt Continuity Hardening, documented in `docs/phase-1-8-validation.md`.
- Issue #20 — Receipt Proof Hardening, completed by PR #24.
- Issue #26 — V1 Release Candidate Freeze Plan, completed as V1 RC Freeze.
- Operational automation gates, installed by PR #25.

## Próximo trabajo correcto

No hay active implementation item.

En V1 RC Freeze, cualquier trabajo posterior requiere issue separado, clasificación, gates requeridos y Founder approval explícito.

Posibles trabajos futuros no autorizados por este README:

- P1 hardening si aparece un riesgo sobre pago, saldo, receipt, demo/API, falso éxito, loading/error ambiguo o claridad operativa.
- P2 polish si es cosmético y no afecta interpretación transaccional.
- RC sign-off final con evidencia técnica y validación mobile 390x844.

## Alcance V1

IN V1:

- registro/login;
- cuenta y estado de usuario;
- wallet PEN;
- transferencias internas;
- cobros / payment requests;
- historial / activity;
- comprobantes;
- QR básico como display;
- modo comercio básico cuando el core esté estable.

Fuera de V1 salvo aprobación explícita:

- USDT público;
- conversions;
- IonExchange Link;
- Ion Card;
- Ion Disposable Card;
- Ion Touch / NFC;
- QR camera scanning;
- Ion Checkout avanzado;
- Ion Gateway;
- Ion Payouts;
- cashback;
- referidos;
- préstamos;
- multi-currency public surface;
- producción pública;
- dinero real;
- release público.

## Arquitectura actual

- Frontend: React, TypeScript y Vite.
- Android: Capacitor, proyecto nativo dentro de `android/`.
- Backend local: Node.js dentro de `server/`.
- Base de datos: SQLite integrado.
- Contabilidad: ledger de doble entrada con montos almacenados como enteros.
- Backend como fuente de verdad para wallet, saldo, activity, transfers y payment requests.

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

## Validación requerida para cambios futuros

Pre-PR local:

```powershell
./scripts/pre-pr-check.ps1
```

Build web:

```bash
pnpm build
```

Tests backend:

```bash
pnpm api:test
```

Sincronizar Android:

```bash
pnpm android:sync
```

Diff check:

```bash
git diff --check
```

## Hard boundary

Bloqueado salvo gate separado:

- producción;
- dinero real;
- release público;
- backend;
- ledger;
- DB/schema/migrations;
- auth financiero;
- money parser;
- idempotency;
- `package.json`;
- `pnpm-lock.yaml`;
- Android native;
- iOS;
- QR scanner;
- camera;
- public USDT;
- conversions;
- cards;
- IonExchange;
- checkout/gateway/payouts;
- new feature scope sin issue/gate fresco.

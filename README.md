# IONPAY

IONPAY es una billetera financiera Android-first construida de forma incremental. El objetivo no es desarrollar todos los módulos al mismo tiempo, sino consolidar primero el núcleo seguro de cuenta, wallet, ledger, transferencias, cobros y trazabilidad; después integrar la interfaz; luego validar Android; y solo más adelante evaluar iOS y producción.

La fuente operativa para agentes dentro del repositorio es [`AGENTS.md`](./AGENTS.md). Este README resume el estado del proyecto para revisión rápida y onboarding técnico.

## Principio de desarrollo

IONPAY se desarrolla por fases pequeñas, verificables y revisables.

Regla central:

- una fase o gap activo;
- una frontera de alcance;
- una PR pequeña cuando aplique;
- una validación clara;
- reviewer obligatorio cuando hay riesgo financiero;
- ningún merge final, cierre de fase o release sin autorización humana explícita.

## Estado operativo actual

### Estado de control

Estado actual: **V1 READINESS / POST-HARDENING RECONCILIATION**.

No hay producción pública ni dinero real.

No hay active implementation item autorizado.

Issue #20 está **closed / completed**. El hardening de comprobantes fue implementado, revisado, aprobado y mergeado mediante PR #24.

La automatización operativa base está instalada en `main` mediante PR #25.

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

Capacidades instaladas:

- GitHub Actions validation workflow;
- PR template con declaración de scope y evidencia obligatoria;
- script local de pre-PR con detección de superficies restringidas.

La automatización refuerza gates. No aprueba seguridad financiera, ledger, producción, dinero real ni scope de producto.

### PRs reconciliados

- PR #22: closed / not merged. No usar como evidencia de implementación porque GitHub reportó `changed_files: 0`, `additions: 0`, `deletions: 0` y patch vacío.
- PR #23: closed / not merged. Superseded por PR #24. No usar como evidencia de implementación de Issue #20.
- PR #24: closed / merged. Fuente de verdad para Issue #20.
- PR #25: closed / merged. Fuente de verdad para automation gates.

## Fases completadas / documentadas

- Phase 0.1 — Agent Operating System.
- Phase 1.1A — Onboarding structure.
- Phase 1.1B — V1 Scope Lock UI.
- Phase 1.2A — Financial Core Hardening.
- Phase 1.2B — Backend V1 Surface Lock.
- Phase 1.2C — Idempotency & Retry Safety.
- Phase 1.3A — Payment Requests Foundation.
- Phase 1.3B — V1 Product Surface Lock.
- Phase 1.4 — Account, Wallet & Single Fiat Balance.
- Phase 1.5 — Frontend API Integration for Transfers and Payment Requests.
- Phase 1.8 / 1.8B — Payment Requests UX + Activity/Receipt Continuity Hardening, documented in `docs/phase-1-8-validation.md`.
- Issue #20 — Receipt Proof Hardening, completed by PR #24.
- Operational automation gates, installed by PR #25.

## Próximo trabajo correcto

### P0.3 — Reconciliar Issue #10: V1 Product Surface Lock

Issue #10 sigue abierto y debe ser clasificado antes de iniciar nueva feature.

Resultado esperado de clasificación:

```text
A. Issue #10 ya está satisfecho por el estado actual → cerrar con evidencia.
B. Issue #10 sigue abierto como hardening de superficie → convertir en próxima tarea P1.
C. Issue #10 queda post-V1 → Founder + Product Architect + Scope Guardian deben aprobar.
```

Agentes requeridos:

- Product Architect;
- Scope Guardian;
- Founder approval.

Condicionales:

- Frontend Surface Reviewer si se requieren cambios visuales o de claridad mobile;
- Financial Safety Reviewer si se toca copy o UI que pueda sugerir saldo, pagos reales, recibos válidos, producción o dinero real.

No iniciar feature nueva hasta resolver la clasificación de Issue #10.

## Roadmap V1 pendiente

Sujeto a reconciliar Issue #10:

- V1 Product Surface Lock final.
- Demo hardening: edge cases, loading states, empty states, error states, copy and mobile clarity.
- V1 release candidate freeze.

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
- producción pública o dinero real.

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
- new feature scope sin issue/gate fresco.

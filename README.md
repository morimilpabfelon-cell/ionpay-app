# IONPAY

IONPAY es una billetera financiera Android-first construida de forma incremental. El objetivo no es desarrollar todos los módulos al mismo tiempo, sino consolidar primero el núcleo seguro de cuenta, wallet, ledger, transferencias, cobros y trazabilidad; después integrar la interfaz; luego validar Android; y solo más adelante evaluar iOS y producción.

La fuente operativa para agentes dentro del repositorio es [`AGENTS.md`](./AGENTS.md). Este README resume el estado del proyecto para revisión rápida y onboarding técnico.

## Principio de desarrollo

IONPAY se desarrolla por fases pequeñas, verificables y revisables.

Regla central:

- una fase;
- una frontera de alcance;
- una PR pequeña;
- una validación clara;
- reviewer obligatorio cuando hay riesgo financiero;
- ningún merge final o release sin autorización humana explícita.

## Estado operativo actual

### Estado de control

Estado actual: **RECONCILED WITH ACTIVE HARDENING GAP**.

No hay producción pública ni dinero real.

El producto avanzó hasta Phase 1.8 / 1.8B en `main`, pero queda abierto un gap de hardening de comprobantes/actividad en Issue #20.

### Última mejora validada documentada

- **Phase 1.8 / 1.8B — Payment Requests UX + Activity/Receipt Continuity Hardening**.
- Estado documentado: **VALIDATED + REVIEWED + FOUNDER-AUTHORIZED PHASE CLOSURE**.
- Documento: `docs/phase-1-8-validation.md`.
- Commit de implementación registrado: `c8a7118f06a353bde56672ea9f1d1e27e3a9adca`.
- Commit final registrado: `bec6ccd1aa2fa87d5e0be732a25e24dba5e026aa`.
- Archivo principal de implementación: `src/components/ServicesPage.tsx`.

Alcance de Phase 1.8B:

- rediseño mobile de Cobros / Payment Requests;
- header compacto;
- resumen superior;
- tabs `Recibidas` / `Creadas`;
- cards compactas;
- detalle en bottom sheet;
- QR local solo dentro del detalle y solo para requests `PENDING`;
- separación entre request, activity y receipt como evidencia.

### Gap activo

- Issue: **#20**.
- Título actual: **Receipt Proof Hardening — explicit confirmed-activity gate**.
- Estado: **open / active hardening gap**.
- Riesgo: **R3 — financial proof / receipt integrity risk**.

Objetivo:

- permitir receipt solo desde actividad confirmada/completada derivada del backend;
- bloquear receipt para pending, failed, missing confirmation o estado local-only en API mode;
- mantener demo claramente simulada;
- mantener superficie pública PEN-only;
- no tocar backend, ledger, DB, auth, Android, package ni lockfile.

### PR cerrado durante reconciliación

- PR: **#22**.
- Estado: **closed / not merged**.
- Razón: GitHub reportó `changed_files: 0`, `additions: 0`, `deletions: 0`, y patch vacío.
- Conclusión: PR #22 no puede usarse como evidencia de implementación para Issue #20.

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

## Próximo trabajo correcto

### Issue #20 — Receipt Proof Hardening

Estado: active hardening gap.

No iniciar nueva feature hasta decidir e implementar este gap o marcarlo explícitamente como post-V1.

Permitido para Issue #20:

- `src/App.tsx`;
- `src/lib/api.ts`;
- `src/types.ts`;
- `src/styles.css`.

Bloqueado para Issue #20 salvo autorización separada:

- `server/**`;
- DB/schema/migrations;
- ledger;
- money parser;
- auth financiero;
- `package.json`;
- `pnpm-lock.yaml`;
- `android/**`;
- `ios/**`;
- QR scanner;
- camera;
- public USDT;
- conversions;
- producción;
- dinero real.

Review requerido:

- Financial Safety Reviewer / Security & Ledger Auditor;
- Frontend Surface Reviewer;
- Founder approval before closure.

## Roadmap V1 pendiente

Sujeto a resolver o posponer explícitamente Issue #20:

- Receipt Proof Hardening — explicit confirmed-activity gate.
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

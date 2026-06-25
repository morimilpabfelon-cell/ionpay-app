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

### Últimas fases cerradas

- **Phase 1.4 — Account, Wallet & Single Fiat Balance**
- Estado: **MERGED + POST-MERGE VALIDATED**
- Resultado: wallet V1 con PEN como balance público, guards de operabilidad, reconciliación contra ledger, protección de payment requests, idempotency y tests backend pasando.

- **Phase 1.5 — Frontend API Integration for Transfers and Payment Requests**
- Estado: **MERGED + POST-MERGE VALIDATED**
- Issue: **#16**
- PR: **#17**
- Estado PR: **closed / merged**
- Merge commit: `e17624c997178edbe10831fa26b4de0f1d21751a`
- Head commit revisado por R3: `1034b76249086a5889a974630fa39a2233d8c483`
- Riesgo: **R3** porque conecta frontend con rutas que pueden iniciar movimientos de saldo.

Validación post-merge documentada:

- `pnpm build`: **PASS**.
- `pnpm api:test`: **PASS**, 22/22.
- `pnpm android:sync`: **PASS**.
- `git diff --check`: **PASS**, solo warnings CRLF de Android.
- `git status`: **PASS**, working tree clean.

Revisión manual mobile confirmada por el usuario fundador:

- viewport aproximado 390x844: **PASS**;
- registro/login: **PASS**;
- wallet PEN: **PASS**;
- activity: **PASS**;
- crear solicitud de pago: **PASS**;
- pagar solicitud: **PASS**;
- cancelar solicitud: **PASS**;
- doble click rápido en enviar/pagar/crear/cancelar: **PASS**;
- errores backend visibles: **PASS**;
- no falso éxito: **PASS**;
- no USDT público: **PASS**;
- no conversions: **PASS**;
- demo separada como simulación: **PASS**.

Resultado:

- Phase 1.5 queda cerrada como **MERGED + POST-MERGE VALIDATED**.
- Phase 1.6 queda lista para **Scope Guardian gate**.
- No iniciar Codex para Phase 1.6 sin Scope Guardian output.

Alcance aplicado por PR #17:

- `src/App.tsx`;
- `src/components/ServicesPage.tsx`;
- `src/lib/api.ts`;
- `src/styles.css`;
- `src/types.ts`.

No autorizado por este merge:

- `server/**`;
- DB/schema/migrations;
- ledger;
- money parser;
- auth financiero;
- `package.json`;
- `pnpm-lock.yaml`;
- `android/**`;
- Figma;
- Notion;
- producción;
- dinero real.

Estado de revisión Phase 1.5:

- R3 inicial: **blocking / request changes operacional**.
- R3 re-review: **APPROVED WITH CONDITIONS**.
- Command validation: **COMPLETE**.
- Manual mobile validation: **COMPLETE**.
- Final status: **MERGED + POST-MERGE VALIDATED**.

## Fases completadas

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

## Roadmap V1

### Phase 1.6 — Receipts and activity proof

Estado: lista para Scope Guardian gate.

No ejecutar todavía sin:

- clasificación IN/OUT;
- prioridad;
- riesgo;
- archivos permitidos;
- archivos bloqueados;
- criterios de aceptación;
- reviewer requerido.

### Próximas fases V1

- Phase 1.7 — Basic QR display for payment requests, without camera scanner.
- Phase 1.8 — Basic merchant mode.
- Phase 1.9 — Demo hardening: edge cases, loading states, empty states, error states, copy and mobile clarity.
- Phase 1.10 — V1 release candidate freeze.

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

Revisar diff:

```bash
git diff --check
```

Revisión manual mínima para cambios visibles:

- registro/login;
- wallet PEN;
- activity;
- crear solicitud de pago;
- pagar solicitud;
- cancelar solicitud;
- doble click rápido en enviar/pagar/crear/cancelar;
- errores backend visibles;
- no falso éxito;
- no USDT público;
- no conversions;
- viewport móvil aproximado 390x844.

Regla mínima:

- ejecutar `pnpm build` antes de entregar cambios frontend;
- ejecutar `pnpm api:test` si se toca backend, auth, wallet, saldo, ledger, transfers o payment requests;
- ejecutar `pnpm api:test` cuando el frontend invoque rutas financieras, aunque `server/**` no cambie;
- ejecutar `pnpm android:sync` cuando cambios web deban llegar al APK;
- ejecutar `git diff --check` antes de entregar PRs;
- reportar evidencia clara en PR o issue.

## Android

Android es la plataforma principal del proyecto.

Estado actual:

- Capacitor está configurado;
- el proyecto nativo existe en `android/`;
- el identificador de app es `com.ionpay.app`;
- `pnpm android:sync` debe mantenerse pasando después de cambios web relevantes.

Roadmap Android:

1. Android 0 — mantener sync pasando.
2. Android 1 — ejecutar en emulador o dispositivo.
3. Android 2 — validar flujos V1 en viewport móvil y shell nativo.
4. Android 3 — preparar build interno de prueba.
5. Android 4 — preparación de tienda solo después de cierre V1, revisión financiera y aprobación humana.

## iOS

iOS no es fase activa todavía.

Roadmap iOS:

1. iOS 0 — gate de decisión.
2. iOS 1 — agregar plataforma iOS solo después de core V1 y estabilidad Android.
3. iOS 2 — Xcode build y validación en simulador.
4. iOS 3 — TestFlight solo después de gates de seguridad, compliance y aprobación humana.

No agregar iOS como reacción prematura mientras el core V1 y Android no estén estabilizados.

## Seguridad

- No conectar bancos, proveedores financieros, blockchain, tarjetas ni producción sin aprobación explícita.
- No usar números de punto flotante para saldos o asientos contables.
- No cambiar schema, migrations, ledger, money parser, auth o rutas financieras sin gate técnico y Financial Safety Reviewer.
- No presentar fondos demo como dinero real.

## Gates obligatorios

1. Scope Guardian antes de implementar fases con posible scope creep.
2. Software Engineer antes de Codex cuando hay cambios técnicos no triviales.
3. Financial Safety Reviewer cuando se toca wallet, saldo, ledger, auth, transfers, payment requests, DB, idempotency o estados de éxito/error financieros.
4. Frontend Surface Reviewer después de cambios visibles.
5. Mobile gate antes de Android/iOS packaging.
6. Founder approval antes de release.
7. Post-merge validation gate cuando un PR financiero ya fue mergeado sin evidencia final visible.

## Estado final esperado de V1

Una app Android-first con:

- cuenta funcional;
- wallet PEN;
- transferencias internas;
- cobros/payment requests;
- historial y comprobantes;
- QR básico;
- modo comercio básico;
- trazabilidad suficiente;
- seguridad financiera auditada;
- demo estable sin prometer producción ni dinero real.
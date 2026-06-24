# IONPAY

IONPAY es una billetera financiera Android-first construida de forma incremental. El objetivo no es intentar desarrollar todos los módulos a la vez, sino consolidar primero el núcleo seguro de cuenta, wallet, ledger, transferencias, cobros y trazabilidad; luego integrar la interfaz; después validar Android; y solo más adelante evaluar iOS y producción.

La fuente operativa para agentes dentro del repositorio es [`AGENTS.md`](./AGENTS.md). Este README resume el estado del proyecto para humanos, revisión rápida y onboarding técnico.

## Principio de desarrollo

IONPAY se desarrolla por fases pequeñas, verificables y revisables.

Regla central:

- una fase;
- una frontera de alcance;
- una PR pequeña;
- una validación clara;
- un reviewer obligatorio cuando hay riesgo financiero;
- ningún merge sin autorización humana explícita.

El error a evitar es construir wallet, pagos, QR, comercio, Android, iOS, exchange, tarjetas y productos financieros al mismo tiempo.

## Estado operativo actual

Última fase cerrada:

- **Phase 1.4 — Account, Wallet & Single Fiat Balance**
- Estado: **MERGED + POST-MERGE VALIDATED**
- Resultado: wallet V1 con PEN como balance público, guards de operabilidad, reconciliación contra ledger, protección de payment requests, idempotency y tests backend pasando.

Fase activa:

- **Phase 1.5 — Frontend API Integration for Transfers and Payment Requests**
- Issue: **#16**
- Estado: **APPROVED FOR IMPLEMENTATION**
- Scope Guardian: **APPROVED FOR IMPLEMENTATION**
- Alcance permitido: **frontend-only en `src/**`**.
- Archivos bloqueados salvo aprobación separada: `server/**`, `package.json`, `pnpm-lock.yaml`, `android/**`, Figma y Notion.
- Riesgo: **R3** porque conecta frontend con rutas que pueden iniciar movimientos de saldo.
- Reviewer obligatorio posterior: **Financial Safety Reviewer / Security & Ledger Auditor**.

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

## Roadmap V1

### Phase 1.5A — Read-only frontend integration

Objetivo: conectar la interfaz a datos confirmados por backend sin activar todavía acciones que muevan saldo si el gate no está cerrado.

Incluye:

- wallet desde `GET /api/wallet`;
- activity desde `GET /api/activity`;
- listas de payment requests;
- estados de carga, vacío y error;
- PEN-only public surface.

### Phase 1.5B — Money-moving frontend actions

Objetivo: conectar acciones frontend que crean o ejecutan operaciones, siempre con backend como fuente de verdad.

Incluye:

- `POST /api/transfers`;
- `POST /api/payment-requests`;
- `POST /api/payment-requests/:id/pay`;
- `POST /api/payment-requests/:id/cancel`;
- idempotency cuando aplique;
- refresh de wallet/activity/requests después de confirmación backend;
- no false success states.

### Próximas fases V1

- Phase 1.6 — Receipts and activity proof.
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

## Validación

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

Regla mínima:

- ejecutar `pnpm build` antes de entregar cambios frontend;
- ejecutar `pnpm api:test` si se toca backend, auth, wallet, saldo, ledger, transfers o payment requests;
- ejecutar `pnpm android:sync` cuando cambios web deban llegar al APK;
- reportar evidencia clara en PR.

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

- No incluir contraseñas, tokens, API keys, credenciales, archivos `.env`, keystores o datos financieros reales.
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
6. Founder approval antes de merge final o release.

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

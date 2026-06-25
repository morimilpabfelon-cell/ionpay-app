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

### Última fase cerrada

- **Phase 1.4 — Account, Wallet & Single Fiat Balance**
- Estado: **MERGED + POST-MERGE VALIDATED**
- Resultado: wallet V1 con PEN como balance público, guards de operabilidad, reconciliación contra ledger, protección de payment requests, idempotency y tests backend pasando.

### Fase actual en HOLD

- **Phase 1.5 — Frontend API Integration for Transfers and Payment Requests**
- Issue: **#16**
- PR: **#17**
- Estado PR: **closed / merged**
- Merge commit: `e17624c997178edbe10831fa26b4de0f1d21751a`
- Head commit revisado por R3: `1034b76249086a5889a974630fa39a2233d8c483`
- Estado de fase: **MERGED / POST-MERGE VALIDATION PENDING**
- Riesgo: **R3** porque conecta frontend con rutas que pueden iniciar movimientos de saldo.
- Issue #16 debe permanecer abierto hasta validar post-merge.
- Phase 1.6 queda bloqueada hasta cerrar esta validación.

Alcance aplicado por PR #17:

- `src/App.tsx`;
- `src/components/ServicesPage.tsx`;
- `src/lib/api.ts`;
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

Estado de revisión:

- R3 inicial: **blocking / request changes operacional**.
- R3 re-review: **APPROVED WITH CONDITIONS**.
- Condiciones pendientes de evidencia visible:
  - `pnpm build`;
  - `pnpm api:test`;
  - `pnpm android:sync`;
  - `git diff --check`;
  - revisión manual mobile alrededor de 390x844;
  - documentación de post-merge validation.

Resultado esperado:

- Si la validación pasa: marcar Phase 1.5 como **MERGED + POST-MERGE VALIDATED** y preparar cierre de Issue #16.
- Si la validación falla: abrir Phase 1.5C hotfix, mantener Issue #16 abierto y bloquear Phase 1.6.

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

### Phase 1.5C — Post-merge validation / safety fixes

Objetivo: validar el merge de PR #17 y corregir cualquier hallazgo antes de avanzar.

Incluye:

- ejecutar y documentar validación post-merge;
- revisar flujo móvil en viewport aproximado 390x844;
- verificar no doble submit;
- verificar errores backend visibles sin falso éxito;
- verificar PEN-only surface;
- verificar que USDT y conversions siguen fuera de la UI pública;
- repetir validación si hay fixes;
- ninguna feature nueva;
- ningún cambio backend salvo gate técnico separado.

### Próximas fases V1

- Phase 1.6 — Receipts and activity proof. **Bloqueada hasta cerrar Phase 1.5 post-merge validation.**
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

## Validación post-merge requerida

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

Revisión manual mínima:

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

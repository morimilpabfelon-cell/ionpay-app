# IONPAY — instrucciones para agentes

## Objetivo

IONPAY es una billetera Android-first del ecosistema Ion. Debe construirse por fases: primero núcleo seguro, después integración de flujos, luego validación móvil, y despliegue público solo al final.

Regla central: no construir wallet, pagos, QR, comercio, Android, iOS, exchange, tarjetas y módulos avanzados al mismo tiempo.

## Reglas institucionales

- Ningún agente trabaja desde cero ni inventa dirección.
- Antes de ejecutar, consultar estado operativo vigente, `AGENTS.md`, `README.md`, GitHub y memoria externa `ionpay-ops-memory` cuando aplique.
- Toda tarea debe tener fase o gap activo, alcance, prioridad, riesgo, gate y condición de salida.
- Codex no está activo para este proyecto.
- Codex no decide producto, no aprueba seguridad de saldos y no revisa su propio trabajo.
- Operating Executor coordina y ejecuta trabajo autorizado, pero no aprueba seguridad de saldos.
- Product Architect define alcance y orden; no implementa código.
- Scope Guardian bloquea scope creep y define archivos permitidos/bloqueados.
- Software Engineer audita y prepara instrucciones; no autoriza merge por sí solo.
- Financial Safety Reviewer revisa wallet, saldo, transferencias, cobros, idempotency, receipts y estados de pago.
- Frontend Surface Reviewer revisa UI, errores, claridad, mobile usability y riesgo de falso éxito.
- Founder approval es obligatorio antes de merge final, cierre de fase o release.
- Si un PR de saldo/pagos se mergea sin evidencia visible completa, el estado pasa a HOLD hasta cerrar post-merge validation.

## Memoria operativa obligatoria

Antes de iniciar cualquier tarea, consultar o reconstruir:

1. `README.md`.
2. `AGENTS.md`.
3. Issue/PR activo de GitHub.
4. Último documento de validación en `docs/`.
5. Memoria externa `morimilpabfelon-cell/ionpay-ops-memory` cuando haya duda de estado.
6. `STATE.md`, `CURRENT_PHASE.md`, `OPS_INDEX.json` y gate activo en `ionpay-ops-memory` si la tarea afecta planificación, gates o reconciliación.

Si no existe handoff suficiente, generar reporte antes de enrutar trabajo.

## Estado operativo actual

### Estado de control

Estado actual: **RECONCILED WITH ACTIVE HARDENING GAP**.

No hay despliegue público de pagos.

Producto en `main` avanzó hasta Phase 1.8 / 1.8B, pero sigue abierto un gap R3 de receipt/activity proof en Issue #20.

### Última mejora validada documentada

- Phase 1.8 / 1.8B — Payment Requests UX + Activity/Receipt Continuity Hardening.
- Estado documentado: VALIDATED + REVIEWED + FOUNDER-AUTHORIZED PHASE CLOSURE.
- Documento: `docs/phase-1-8-validation.md`.
- Commit de implementación registrado: `c8a7118f06a353bde56672ea9f1d1e27e3a9adca`.
- Commit final registrado: `bec6ccd1aa2fa87d5e0be732a25e24dba5e026aa`.
- Archivo principal de implementación: `src/components/ServicesPage.tsx`.

### Gap activo

Issue activo:

- Issue #20 — Receipt Proof Hardening — explicit confirmed-activity gate.
- Estado: open / active hardening gap.
- Riesgo: R3 — proof integrity risk.
- Review requerido: Financial Safety Reviewer + Frontend Surface Reviewer + Founder approval.

Objetivo:

- receipt solo desde actividad backend confirmada/completada;
- no receipt para pending, failed, missing confirmation o estado local-only en API mode;
- demo claramente simulada;
- PEN-only público;
- no conversions.

### PR cerrado durante reconciliación

- PR #22 — Closed: Phase 1.6 receipt proof PR had no effective diff.
- Estado: closed / not merged.
- No usar como evidencia de implementación.
- Razón: `changed_files: 0`, `additions: 0`, `deletions: 0`, patch vacío.

## Roadmap operativo

### Completadas / documentadas

- Phase 0.1 — Agent Operating System.
- Phase 1.1A — Onboarding structure.
- Phase 1.1B — V1 Scope Lock UI.
- Phase 1.2A — Core Hardening.
- Phase 1.2B — Backend V1 Surface Lock.
- Phase 1.2C — Idempotency & Retry Safety.
- Phase 1.3A — Payment Requests Foundation.
- Phase 1.3B — V1 Product Surface Lock.
- Phase 1.4 — Account, Wallet & Single Fiat Balance.
- Phase 1.5 — Frontend API Integration for Transfers and Payment Requests.
- Phase 1.8 / 1.8B — Payment Requests UX + Activity/Receipt Continuity Hardening, documented in `docs/phase-1-8-validation.md`.

### Siguiente trabajo correcto

Issue #20 — Receipt Proof Hardening.

No iniciar nueva feature hasta que Issue #20 sea:

- implementado y cerrado con evidencia; o
- explícitamente pospuesto como post-V1 por Founder + Product Architect + Scope Guardian.

## Scope para Issue #20

Permitido:

- `src/App.tsx`;
- `src/lib/api.ts`;
- `src/types.ts`;
- `src/styles.css`.

Bloqueado salvo gate separado:

- `server/**`;
- DB/schema/migrations;
- ledger;
- money parser;
- auth de pagos;
- `package.json`;
- `pnpm-lock.yaml`;
- `android/**`;
- `ios/**`;
- QR scanner;
- camera;
- public USDT;
- conversions;
- despliegue público.

## Reglas de producto V1

- PEN es el único balance público visible en V1.
- USDT permanece oculto públicamente en V1.
- No presentar USDT como medio de pago cotidiano.
- No habilitar conversions en V1 salvo decisión explícita posterior.
- Backend es fuente de verdad para wallet, saldo, activity, transfers y payment requests.
- Ninguna función demo debe presentarse como integración externa activa.
- Android es la plataforma principal; iOS no es fase activa.
- Un receipt no puede presentarse como comprobante válido si no viene de actividad backend confirmada o demo claramente simulada.

## Gates obligatorios

1. Scope gate.
2. Technical gate.
3. Financial safety gate.
4. Frontend review gate.
5. Mobile gate.
6. Founder approval gate.
7. Post-merge validation gate cuando un PR de pagos ya fue mergeado sin evidencia final visible.

Para Issue #20, los gates mínimos son:

- Scope Guardian confirmation;
- Financial Safety Reviewer;
- Frontend Surface Reviewer;
- command validation;
- mobile validation around 390x844;
- founder closure.

## Comandos mínimos

```bash
pnpm install
pnpm build
pnpm api:test
pnpm android:sync
git diff --check
```

## Verificación mínima

1. Ejecutar `pnpm build`.
2. Ejecutar `pnpm api:test` si se toca backend, auth, wallet, saldo, ledger, transfers o payment requests.
3. Ejecutar `pnpm api:test` cuando frontend invoque rutas de pagos, aunque `server/**` no cambie.
4. Probar pantallas modificadas en tamaño móvil.
5. Ejecutar `pnpm android:sync` cuando cambios web deban llegar al APK.
6. Ejecutar `git diff --check`.
7. Reportar fase/gap, issue/PR, archivos, comandos, resultados, riesgos restantes y revisor requerido.

## Stop conditions

Detener trabajo y reportar si aparece cualquiera de estos casos:

- cambios en backend, ledger, DB, auth, package, lockfile o Android sin gate;
- receipt para estado pending/failed/missing confirmation;
- falso éxito;
- public USDT;
- conversions públicas;
- QR scanner/camera;
- despliegue público no aprobado;
- PR vacío tratado como evidencia;
- reviewer de seguridad de pagos ausente en scope R3.

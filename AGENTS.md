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
- Agent Orchestrator & Memory Manager coordina agentes, memoria, routing, gates y cola; no ejecuta código.
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

Estado actual: **V1 READINESS / NO ACTIVE IMPLEMENTATION ITEM**.

No hay despliegue público de pagos.

No hay producción pública ni dinero real.

No hay active implementation item autorizado.

Issue #10 está **closed / completed** como cierre administrativo. PR #11 es la evidencia principal de Phase 1.3B — V1 Product Surface Lock.

Issue #20 está **closed / completed**. Fue implementado y mergeado mediante PR #24.

PR #25 instaló automation gates en `main`.

### Última reconciliación administrativa

Issue #10 — Phase 1.3B — V1 Product Surface Lock.

Evidencia:

- Issue: `ionpay-app#10`.
- Issue state: closed / completed.
- Primary implementation PR: `ionpay-app#11`.
- PR #11 state: closed / merged.
- PR #11 merge SHA: `23000ce37286f21b4637fe4da45ad9c97c45c905`.
- PR #11 head SHA: `baa8672747f883007e9bd23875ab9926eba7a6de`.
- Secondary reinforcement: `ionpay-app#13` for PEN-only backend / wallet exposure.

Conclusion:

- Issue #10 is administratively closed as completed;
- no new P1 task is opened;
- no post-V1 deferral is needed;
- no additional implementation is authorized by this closure;
- PR #22 and PR #23 must not be used as implementation evidence.

### Última mejora de producto cerrada

Issue #20 — Receipt Proof Hardening — explicit confirmed-activity gate.

Evidencia:

- PR: `ionpay-app#24`.
- Estado: closed / merged.
- Branch: `issue-20-proof-gate`.
- Reviewed head SHA: `115cd2a45dab98a937008d0d7f1dc4952b09a1c3`.
- Squash merge SHA: `01d0a5aa9cf41b34b177bded26f93209080f0fc2`.
- Issue: `ionpay-app#20`.
- Issue state: closed / completed.

Resultado implementado:

- receipt solo desde actividad PEN completada;
- API-mode receipts requieren metadata de prueba API/backend;
- missing-confirmation, pending, failed, non-PEN, unavailable y local-only API states no pueden abrir receipts;
- demo receipts quedan claramente simulados;
- unavailable receipt UI es visible y no clickable.

Archivos modificados por PR #24:

- `src/App.tsx`;
- `src/lib/api.ts`;
- `src/types.ts`;
- `src/styles.css`.

### Automatización operativa instalada

Evidencia:

- PR: `ionpay-app#25`.
- Estado: closed / merged.
- Merge SHA: `fba68e68436ede6030c4228e70e9c6989aa6b398`.

Archivos instalados:

- `.github/workflows/validate.yml`;
- `.github/pull_request_template.md`;
- `scripts/pre-pr-check.ps1`.

Uso esperado antes de PR:

```powershell
./scripts/pre-pr-check.ps1
```

La automatización refuerza gates. No aprueba financial safety, ledger, producción, dinero real ni scope de producto.

### PRs e issues reconciliados

- Issue #10 — closed / completed. Cierre administrativo con PR #11 como evidencia principal.
- Issue #20 — closed / completed. Implementado por PR #24.
- PR #22 — closed / not merged. No usar como evidencia de implementación. Razón: `changed_files: 0`, `additions: 0`, `deletions: 0`, patch vacío.
- PR #23 — closed / not merged. Superseded por PR #24. No usar como evidencia de implementación.
- PR #24 — closed / merged. Fuente de verdad para Issue #20.
- PR #25 — closed / merged. Fuente de verdad para automation gates.

## Roadmap operativo

### Completadas / documentadas

- Phase 0.1 — Agent Operating System.
- Phase 1.1A — Onboarding structure.
- Phase 1.1B — V1 Scope Lock UI.
- Phase 1.2A — Core Hardening.
- Phase 1.2B — Backend V1 Surface Lock.
- Phase 1.2C — Idempotency & Retry Safety.
- Phase 1.3A — Payment Requests Foundation.
- Phase 1.3B — V1 Product Surface Lock, implemented by PR #11 and administratively closed through Issue #10.
- Phase 1.4 — Account, Wallet & Single Fiat Balance.
- Phase 1.5 — Frontend API Integration for Transfers and Payment Requests.
- Phase 1.8 / 1.8B — Payment Requests UX + Activity/Receipt Continuity Hardening, documented in `docs/phase-1-8-validation.md`.
- Issue #20 — Receipt Proof Hardening, completed by PR #24.
- Operational automation gates, installed by PR #25.

### Siguiente trabajo correcto

No hay active implementation item.

No iniciar nueva feature hasta que el Agent Orchestrator & Memory Manager seleccione la siguiente brecha real de V1 Readiness y la enrute por scope classification, required agents y Founder approval.

Candidatos no autorizados todavía:

- Demo hardening: edge cases, loading states, empty states, error states, copy and mobile clarity.
- V1 release candidate freeze plan.

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
3. Financial safety gate cuando aplique a wallet, saldo, pagos, ledger, idempotency, receipts o estados financieros.
4. Frontend review gate cuando aplique a UI/copy/mobile/falso éxito.
5. Mobile gate cuando haya superficie visual o Android/web asset impact.
6. Founder approval gate.
7. Post-merge validation gate cuando un PR de pagos ya fue mergeado sin evidencia final visible.

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

## Verificación mínima

1. Ejecutar `./scripts/pre-pr-check.ps1` antes de PR cuando aplique.
2. Ejecutar `pnpm build`.
3. Ejecutar `pnpm api:test` si se toca backend, auth, wallet, saldo, ledger, transfers o payment requests.
4. Ejecutar `pnpm api:test` cuando frontend invoque rutas de pagos, aunque `server/**` no cambie.
5. Probar pantallas modificadas en tamaño móvil.
6. Ejecutar `pnpm android:sync` cuando cambios web deban llegar al APK.
7. Ejecutar `git diff --check`.
8. Reportar fase/gap, issue/PR, archivos, comandos, resultados, riesgos restantes y revisor requerido.

## Stop conditions

Detener trabajo y reportar si aparece cualquiera de estos casos:

- cambios en backend, ledger, DB, auth, package, lockfile o Android sin gate;
- receipt para estado pending/failed/missing confirmation;
- falso éxito;
- public USDT;
- conversions públicas;
- QR scanner/camera;
- despliegue público no aprobado;
- producción o dinero real;
- PR vacío tratado como evidencia;
- reviewer de seguridad de pagos ausente en scope R3;
- nueva feature sin issue, scope y gate frescos.

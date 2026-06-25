# IONPAY — instrucciones para agentes

## Objetivo

IONPAY es una billetera financiera Android-first del ecosistema Ion. Debe construirse por fases: primero núcleo seguro, después integración de flujos, luego validación móvil y producción solo al final.

Regla central: no construir wallet, pagos, QR, comercio, Android, iOS, exchange, tarjetas y productos financieros al mismo tiempo.

## Reglas institucionales

- Ningún agente trabaja desde cero ni inventa dirección.
- Antes de ejecutar, consultar estado operativo vigente, `AGENTS.md`, `README.md`, GitHub y Notion cuando aplique.
- Toda tarea debe tener fase, alcance, prioridad, riesgo, gate y condición de salida.
- Codex no decide producto, no aprueba seguridad financiera y no revisa su propio trabajo.
- Operating Executor coordina; no aprueba seguridad financiera.
- Software Engineer audita y prepara instrucciones; no autoriza merge por sí solo.
- Financial Safety Reviewer revisa wallet, saldo, transferencias, cobros, idempotency y estados financieros.
- Frontend Surface Reviewer revisa UI, errores, claridad y riesgo de falso éxito.
- Founder approval es obligatorio antes de merge final o release.
- Si un PR financiero se mergea sin evidencia visible completa, el estado pasa a HOLD hasta cerrar post-merge validation.

## Memoria operativa obligatoria

Antes de iniciar cualquier tarea, consultar o reconstruir:

1. ionPAY Agent Operating System / Orchestrator.
2. 01_Project State.
3. 02_Task Pipeline.
4. 05_Risk Register.
5. Último Context Packet relevante.
6. Último Handoff relevante.
7. `AGENTS.md`.
8. `README.md`.
9. GitHub si afecta código, issues, PRs, branches o validación.
10. Notion si afecta producto, alcance, gates, roadmap o estado operativo.

Si no existe Context Packet o Handoff suficiente, generarlo antes de enrutar trabajo.

## Estado operativo actual

### Última fase cerrada

- Phase 1.4 — Account, Wallet & Single Fiat Balance.
- Estado: MERGED + POST-MERGE VALIDATED.

### Fase activa de validación final

- Phase 1.5 — Frontend API Integration for Transfers and Payment Requests.
- Issue: #16.
- PR: #17.
- PR status: closed / merged.
- Merge commit: `e17624c997178edbe10831fa26b4de0f1d21751a`.
- Head commit revisado por R3: `1034b76249086a5889a974630fa39a2233d8c483`.
- Estado de fase: MERGED / COMMAND VALIDATION COMPLETE / MANUAL MOBILE CHECK PENDING.
- Phase 1.6 queda bloqueada hasta cerrar revisión manual mobile.

### Validación post-merge documentada

Evidencia local agregada en PR #17:

- `pnpm install --frozen-lockfile`: PASS.
- `pnpm api:test`: PASS, 22/22.
- `pnpm android:sync`: PASS.
- `pnpm build`: PASS dentro de `pnpm android:sync`.
- `git diff --check`: PASS.
- `git status`: PASS, working tree clean.

Pendiente para cierre total de Phase 1.5:

- revisión manual mobile alrededor de 390x844;
- confirmar registro/login;
- confirmar wallet PEN;
- confirmar activity;
- confirmar crear solicitud de pago;
- confirmar pagar solicitud;
- confirmar cancelar solicitud;
- confirmar doble click rápido en enviar/pagar/crear/cancelar;
- confirmar errores backend visibles;
- confirmar no falso éxito;
- confirmar no USDT público;
- confirmar no conversions.

### Alcance de PR #17

Permitido y aplicado:

- `src/App.tsx`;
- `src/components/ServicesPage.tsx`;
- `src/lib/api.ts`;
- `src/styles.css`;
- `src/types.ts`.

Bloqueado salvo gate separado:

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

### Estado de revisión Phase 1.5

- R3 inicial: blocking / request changes operacional.
- R3 re-review: APPROVED WITH CONDITIONS.
- Command validation: COMPLETE.
- Manual mobile validation: PENDING.

Resultado requerido:

- Si pasa revisión manual mobile: marcar Phase 1.5 como MERGED + POST-MERGE VALIDATED y habilitar Scope Guardian para Phase 1.6.
- Si falla revisión manual mobile: abrir Phase 1.5C hotfix y mantener Phase 1.6 bloqueada.

## Roadmap operativo

### Completadas

- Phase 0.1 — Agent Operating System.
- Phase 1.1A — Onboarding structure.
- Phase 1.1B — V1 Scope Lock UI.
- Phase 1.2A — Financial Core Hardening.
- Phase 1.2B — Backend V1 Surface Lock.
- Phase 1.2C — Idempotency & Retry Safety.
- Phase 1.3A — Payment Requests Foundation.
- Phase 1.3B — V1 Product Surface Lock.
- Phase 1.4 — Account, Wallet & Single Fiat Balance.

### En espera

- Phase 1.5C — Manual mobile validation / safety fixes if needed.

Incluye:

- ejecutar y documentar revisión manual mobile;
- corregir hallazgos si aparecen;
- repetir validación después de cualquier fix;
- no agregar features nuevas;
- no tocar backend salvo gate técnico separado.

### Siguientes fases V1

- Phase 1.6 — Receipts and activity proof. Bloqueada hasta cerrar Phase 1.5 manual mobile validation.
- Phase 1.7 — Basic QR display for payment requests, without camera scanner.
- Phase 1.8 — Basic merchant mode.
- Phase 1.9 — Demo hardening.
- Phase 1.10 — V1 release candidate freeze.

## Reglas de producto V1

- PEN es el único balance público visible en V1.
- USDT permanece oculto públicamente en V1.
- No presentar USDT como medio de pago cotidiano.
- No habilitar conversions en V1 salvo decisión explícita posterior.
- Backend es fuente de verdad para wallet, saldo, activity, transfers y payment requests.
- Ninguna función demo debe presentarse como integración financiera real.
- Android es la plataforma principal; iOS no es fase activa.

## Gates obligatorios

1. Scope gate.
2. Technical gate.
3. Financial safety gate.
4. Frontend review gate.
5. Mobile gate.
6. Founder approval gate.
7. Post-merge validation gate cuando un PR financiero ya fue mergeado sin evidencia final visible.

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
3. Ejecutar `pnpm api:test` cuando frontend invoque rutas financieras, aunque `server/**` no cambie.
4. Probar pantallas modificadas en tamaño móvil.
5. Ejecutar `pnpm android:sync` cuando cambios web deban llegar al APK.
6. Ejecutar `git diff --check`.
7. Reportar fase, issue/PR, archivos, comandos, resultados, riesgos restantes y revisor requerido.

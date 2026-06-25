# IONPAY — instrucciones para agentes

## Objetivo

IONPAY es una billetera financiera Android-first que conecta pagos cotidianos, liquidez e inversión dentro del ecosistema Ion. La experiencia debe ser simple para el usuario aunque la infraestructura interna sea rigurosa.

La regla central del proyecto es construir por fases. No se debe intentar desarrollar wallet, pagos, QR, merchant, Android, iOS, exchange, tarjetas y productos financieros al mismo tiempo. Primero se consolida el núcleo seguro; después se integran flujos; después se empaqueta móvil; producción queda al final.

## Regla institucional de ejecución

- Un agente no debe trabajar desde cero ni inventar dirección.
- Antes de proponer o ejecutar cambios, revisar el estado operativo más reciente en Notion y este archivo.
- Toda tarea debe tener fase, alcance, prioridad, riesgo, gate y condición de salida.
- Toda tarea grande debe dividirse en subfases pequeñas.
- Codex no decide producto, no aprueba seguridad financiera y no revisa su propio trabajo.
- No hacer merge sin autorización humana explícita.
- No conectar producción ni dinero real sin decisión explícita del fundador y revisión financiera.

## Memoria operativa obligatoria

Antes de iniciar cualquier tarea, el agente activo debe consultar o reconstruir el estado operativo vigente desde estas fuentes, en este orden:

1. ionPAY Agent Operating System / Orchestrator.
2. 01_Project State.
3. 02_Task Pipeline.
4. 05_Risk Register.
5. Último Context Packet relevante.
6. Último Handoff relevante.
7. `AGENTS.md`.
8. `README.md`.
9. GitHub, si la tarea afecta código, issues, PRs, branches o validación.
10. Notion, si la tarea afecta producto, alcance, gates, roadmap o estado operativo.

Si no existe un Context Packet o Handoff suficiente, el agente debe generarlo antes de enrutar trabajo. Ningún agente debe ejecutar desde memoria incompleta, contexto antiguo o supuestos no verificados.

## Separación de roles

- Product Architect define qué debe construirse, por qué, en qué orden y con qué criterios.
- Scope Guardian clasifica alcance, riesgo y límites de ejecución.
- Software Engineer audita, diagnostica y prepara instrucciones técnicas; no debe aprobar seguridad financiera ni revisar su propio trabajo.
- Codex modifica archivos y prepara commits/PRs solo cuando el alcance está autorizado.
- Operating Executor coordina ejecución práctica, evidencia, gates y handoffs; no aprueba seguridad financiera.
- Financial Safety Reviewer revisa wallet, saldo, ledger, transferencias, payment requests, idempotency y estados financieros.
- Frontend Surface Reviewer revisa claridad visual, estados, errores y riesgo de confusión en UI.
- Founder approval es obligatorio antes de merge final o release.

## Roadmap operativo obligatorio

### Fases ya completadas

- Phase 0.1 — Agent Operating System.
- Phase 1.1A — Onboarding structure.
- Phase 1.1B — V1 Scope Lock UI.
- Phase 1.2A — Financial Core Hardening.
- Phase 1.2B — Backend V1 Surface Lock.
- Phase 1.2C — Idempotency & Retry Safety.
- Phase 1.3A — Payment Requests Foundation.
- Phase 1.3B — V1 Product Surface Lock.
- Phase 1.4 — Account, Wallet & Single Fiat Balance.

### Fase activa

Phase 1.5 — Frontend API Integration for Transfers and Payment Requests.

Estado operativo actual:

- Issue: #16.
- PR activo: #17.
- Estado PR: open draft.
- Merge: prohibido hasta cerrar gates.
- Alcance aplicado en PR #17: frontend-only dentro de `src/**`.
- Archivos modificados por PR #17:
  - `src/App.tsx`;
  - `src/components/ServicesPage.tsx`;
  - `src/lib/api.ts`;
  - `src/types.ts`.
- Pendiente validación local:
  - `pnpm build`;
  - `pnpm api:test`;
  - `pnpm android:sync`;
  - `git diff --check`;
  - revisión manual mobile alrededor de 390x844.
- Pendiente Financial Safety Reviewer / Security & Ledger Auditor.
- Pendiente Frontend Surface Reviewer.
- Pendiente Founder approval.

Debe tratarse como una fase de integración frontend contra APIs backend ya existentes. No es una fase para crear nuevos productos, cambiar ledger, cambiar base de datos, rediseñar backend financiero o habilitar producción.

División recomendada:

- Phase 1.5A — Read-only frontend integration:
  - wallet desde backend;
  - activity desde backend;
  - listas de payment requests;
  - estados de carga, vacío y error;
  - sin activar acciones que muevan saldo si el alcance no está cerrado.

- Phase 1.5B — Money-moving frontend actions:
  - transfer submission;
  - payment request creation;
  - payment request payment;
  - payment request cancellation;
  - idempotency cuando aplique;
  - no false success states;
  - refresh de wallet/activity/requests después de acciones confirmadas por backend.

- Phase 1.5C — Financial Safety Review fixes:
  - corregir hallazgos del Financial Safety Reviewer;
  - corregir hallazgos del Frontend Surface Reviewer;
  - repetir validación local;
  - no agregar features nuevas;
  - no hacer merge hasta aprobación humana explícita.

### Siguientes fases V1

- Phase 1.6 — Receipts and activity proof.
- Phase 1.7 — Basic QR display for payment requests, without camera scanner.
- Phase 1.8 — Basic merchant mode.
- Phase 1.9 — Demo hardening: edge cases, loading states, empty states, error states, copy and mobile clarity.
- Phase 1.10 — V1 release candidate freeze.

### Roadmap Android

- Android 0 — Mantener `pnpm android:sync` pasando después de cambios web relevantes.
- Android 1 — Ejecutar la app en emulador o dispositivo Android.
- Android 2 — Validar flujos V1 en viewport móvil y shell nativo.
- Android 3 — Preparar build interno de prueba.
- Android 4 — Preparación de tienda solo después de cierre V1, revisión financiera y aprobación humana.

### Roadmap iOS

- iOS 0 — Gate de decisión. iOS no es fase activa mientras el core V1 y Android no estén estables.
- iOS 1 — Agregar plataforma iOS solo después de core V1 y estabilidad Android.
- iOS 2 — Xcode build y validación en simulador.
- iOS 3 — TestFlight solo después de gates de seguridad, compliance y aprobación humana.

## Reglas del producto

- El saldo fiat local (PEN en el MVP) se utiliza para pagos, envíos, transferencias, retiros, comercios y tarjetas futuras.
- PEN es el único balance público visible en V1.
- USDT debe permanecer oculto públicamente en V1.
- No presentar USDT como medio de pago cotidiano.
- No habilitar conversions en V1 salvo decisión explícita posterior.
- Toda operación debe tener estado, trazabilidad, actividad y comprobante.
- Mantener visibles las diferencias entre saldo disponible, pendiente y retenido cuando existan.
- Android es la plataforma principal. La vista web es el entorno rápido de desarrollo y validación.
- Ninguna función demo debe presentarse como una integración financiera real.

## Arquitectura actual

- Frontend: React 19, TypeScript y Vite.
- Android: Capacitor, proyecto nativo dentro de `android/`.
- Backend local: Node.js y SQLite integrado dentro de `server/`.
- Contabilidad: ledger de doble entrada con montos almacenados como enteros.
- Persistencia visual demo: `localStorage` solo cuando el flujo aún no esté integrado a la API.
- Backend es fuente de verdad para wallet, saldo, activity, transfers y payment requests.

## Diseño

- Identidad visual basada en blanco y negro con verde lima como acento.
- Logotipo tipográfico: `ionPAY`.
- Diseño móvil limpio, con saldo principal negro, acciones circulares y navegación inferior.
- Conservar accesibilidad, estados visibles, zonas seguras de Android y diseño responsive.
- No eliminar módulos existentes al reorganizar pantallas sin gate de producto y alcance.
- No hacer rediseño visual dentro de fases financieras salvo que el scope lo permita explícitamente.

## Módulos por alcance

### IN V1 / Core

- Cuenta, registro/login, estado de cuenta y KYC básico si ya existe en backend.
- Wallet PEN.
- Transferencias internas.
- Cobros / payment requests.
- Historial / activity.
- Comprobantes.
- QR básico como display, no camera scanner todavía.
- Modo comercio básico cuando el core esté estable.

### LATER / fuera de V1 salvo aprobación explícita

- USDT público.
- Conversions.
- IonExchange Link.
- Ion Card e Ion Disposable Card.
- Ion Touch / NFC.
- QR camera scanning.
- Ion Checkout avanzado.
- Ion Gateway.
- Ion Payouts.
- Cashback.
- Referidos.
- Loans.
- Multi-currency public surface.
- Producción pública o dinero real.

## Seguridad y Git

- Nunca incluir contraseñas, tokens, API keys, credenciales, archivos `.env`, keystores o datos financieros reales.
- No conectar proveedores financieros reales sin requisitos, credenciales de prueba y autorización explícita.
- No usar números de punto flotante para saldos o asientos contables del backend.
- Mantener commits pequeños y descriptivos; no reescribir historial compartido.
- Preservar cambios del usuario y evitar operaciones destructivas de Git.
- No cambiar schema, migrations, ledger, money parser, auth o rutas financieras sin gate técnico y Financial Safety Reviewer.
- No agregar dependencias ni modificar package/lockfile si la fase no lo autoriza.
- No tocar Android/iOS packaging durante fases frontend/backend salvo gate móvil explícito.

## Gates obligatorios

1. Scope gate: clasifica IN V1, V1 SUPPORT, LATER, REQUIRES FOUNDER DECISION o REJECT.
2. Technical gate: define archivos permitidos, contratos API, pruebas y comandos.
3. Financial safety gate: obligatorio si toca wallet, saldo, ledger, auth, payment requests, transfers, DB, idempotency o estados de éxito/error de dinero.
4. Frontend review gate: obligatorio después de cambios visibles.
5. Mobile gate: obligatorio antes de Android/iOS packaging o store preparation.
6. Founder approval gate: obligatorio antes de merge final o release.

## Comandos

```bash
pnpm install
pnpm dev
pnpm build
pnpm api
pnpm api:test
pnpm android:sync
```

## Verificación mínima antes de entregar cambios

1. Ejecutar `pnpm build`.
2. Ejecutar `pnpm api:test` cuando se modifique backend, autenticación, saldos o transacciones.
3. Ejecutar `pnpm api:test` cuando el frontend invoque rutas financieras, aunque `server/**` no cambie.
4. Probar visualmente las pantallas modificadas en tamaño móvil.
5. Sincronizar Android mediante `pnpm android:sync` cuando cambien archivos web que deban llegar al APK.
6. Ejecutar `git diff --check` antes de entregar PRs.
7. Reportar evidencia: fase, issue/PR, archivos cambiados, comandos ejecutados, resultado, riesgos restantes y revisor requerido.

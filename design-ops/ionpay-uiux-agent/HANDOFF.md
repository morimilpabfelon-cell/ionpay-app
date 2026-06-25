# Handoff — ionPAY UI/UX Operation Center

## Responsible agent

ionPAY UI/UX Execution Agent.

## Current branch

```text
tooling/ionpay-uiux-ops-center
```

## PR

```text
#21 — design-ops: add ionPAY UI/UX operation center
```

## What was created

A fully separated design operations center:

```text
design-ops/ionpay-uiux-agent/
```

This folder contains:

- operation center README;
- agent access policy;
- full UI/UX design scope document;
- local Figma plugin MVP;
- starter core pack;
- starter ASCII pack.

## Why this exists

Figma MCP tool calls were repeatedly blocked by rate limits and safety filters. The plugin moves bulk design generation into a local Figma plugin, avoiding dependence on ChatGPT-to-Figma MCP calls for large screen sets.

## Founder clarification now incorporated

The UI/UX Execution Agent is not responsible for only five starter screens.

The actual responsibility is:

- design the full ionPAY UI/UX system;
- cover at least 20 core modules;
- design phone and tablet variants;
- show how the product adapts across compact phones, standard Android, large phones and tablets;
- maintain separation between design artifacts and app implementation;
- keep other agents in observe/read mode unless routed.

## Current plugin status

The plugin MVP now generates a default editable module/device matrix automatically when run in Figma.

Starter modules:

1. Home.
2. Pagar.
3. Cobrar QR.
4. Comprobante.
5. Actividad.
6. Perfil.
7. Merchant.
8. `#ascii Receipt`.

Starter devices:

1. Standard Android — 390 x 844.
2. Tablet Portrait — 768 x 1024.
3. Tablet Landscape — 1024 x 768.

Additional device targets are defined in the plugin for future selection:

- Small Android — 360 x 780.
- Large Phone — 430 x 932.

## Important boundary

This is not production app implementation.

It does not modify:

- `src/`;
- `server/`;
- `android/`;
- DB schema;
- ledger;
- auth;
- wallet balances;
- payment request execution;
- production release behavior.

## Agent access

Other agents may inspect this folder.

Other agents must not change design packs, generate design direction or run visual production through this folder unless the founder explicitly authorizes it or the Agent Orchestrator routes that task to the UI/UX Execution Agent.

## Risk classification

- Financial risk: low while kept as design tooling.
- Product risk: medium if mistaken as implementation authorization.
- Mitigation: folder isolation, policy file, design scope document and PR draft classification.

## Required gates before app implementation

Generated screens require normal gates before becoming app code:

1. Agent Orchestrator routing.
2. Scope Guardian classification.
3. Software Engineer implementation mapping.
4. Financial Safety Reviewer if payment, receipt, balance, transfer, request or success-state behavior is involved.
5. Frontend Surface Reviewer.
6. Founder approval.

## Next recommended work

1. Test the local plugin manually in Figma desktop.
2. Improve UI shell to select modules and devices.
3. Expand packs to the 20+ module target in `DESIGN_SYSTEM_SCOPE.md`.
4. Add design notes per module: phone, tablet, risk, false-success prevention.
5. Keep the PR draft until the founder confirms the operation center structure.

# Agent Access Policy — ionPAY UI/UX Operation Center

## Purpose

This policy prevents confusion between UI/UX design tooling and production ionPAY implementation.

The folder `design-ops/ionpay-uiux-agent/` is a design operations area. It is not a production feature folder.

## Access model

| Agent | Allowed | Not allowed |
|---|---|---|
| ionPAY UI/UX Execution Agent | Create/edit design packs, plugin presets, visual systems and Figma generation logic | Approve financial safety, merge/release, alter wallet/ledger/backend |
| Agent Orchestrator | Read, route, request evidence, enforce gates | Design screens, implement code, approve safety |
| Scope Guardian | Read and classify scope/risk | Design or implement screens |
| Software Engineer | Read for implementation mapping after gate | Change visual direction without UI/UX handoff |
| Financial Safety Reviewer | Read to detect false-success/payment/balance risk | Approve visual direction as product strategy |
| Frontend Surface Reviewer | Read to review clarity and UI risks | Override source of visual truth without founder approval |
| Codex / Operating Executor | Read and execute only after explicit routing | Treat plugin output as implementation authorization |

## Design authority

The current design authority for this folder is:

`ionPAY UI/UX Execution Agent`

Other agents can observe this folder, but they must not generate, replace, reinterpret or mutate the design packs unless the founder explicitly assigns that work.

## Plugin execution rule

The Figma plugin includes a soft operational guard. Generation should be run only when:

1. the founder has requested it; or
2. the ionPAY UI/UX Execution Agent is actively preparing screens; or
3. Agent Orchestrator routes a design-only task to the UI/UX agent.

This is not cryptographic security. It is a project governance guard to prevent accidental misuse.

## Implementation boundary

A generated design screen is not an app requirement until it passes:

- Scope Guardian gate;
- Software Engineer implementation mapping;
- Financial Safety Reviewer review when financial states are involved;
- Frontend Surface Reviewer review;
- Founder approval.

## Forbidden confusion

Do not classify this folder as:

- Phase 1.6 implementation;
- production app code;
- payment execution code;
- wallet logic;
- ledger logic;
- Android release work.

Correct classification:

`Internal design tooling / UIUX operations / Figma plugin`.

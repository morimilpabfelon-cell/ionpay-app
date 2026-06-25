# ionPAY UI/UX Agent Operation Center

This folder is the isolated GitHub operation center for the ionPAY UI/UX Execution Agent.

It exists to keep design tooling, Figma plugin work, screen packs, UI direction and agent handoffs separate from the production app code.

## Status

- Type: internal design operations.
- Owner role: ionPAY UI/UX Execution Agent.
- Scope: Figma screen generation, editable UI packs, visual systems, design handoff preparation.
- App runtime impact: none.
- Production impact: none.
- Financial logic impact: none.

## Hard separation

This folder must not be treated as production app code.

It does not belong to:

- `src/`;
- `server/`;
- `android/`;
- database schema;
- ledger;
- auth;
- wallet balance logic;
- payment request execution;
- release packaging.

## Agent access rule

Other agents may read this folder to understand what the UI/UX Execution Agent is doing.

Other agents must not:

- change screen packs;
- generate new design direction;
- modify Figma through this tooling;
- reinterpret visual product strategy;
- implement generated screens in app code without the required gates.

Only the ionPAY UI/UX Execution Agent may prepare or modify visual packs here, unless the founder explicitly authorizes another agent.

## Required gates before app implementation

Generated screens are design artifacts only. They do not authorize implementation.

Before any generated UI becomes product code, the following routing is required:

1. Agent Orchestrator routes the work.
2. Scope Guardian classifies IN/OUT, priority, risk and allowed files.
3. Software Engineer maps implementation scope.
4. Financial Safety Reviewer reviews any payment, receipt, transfer, wallet, balance or success-state behavior.
5. Frontend Surface Reviewer reviews visible UI clarity and false-success risk.
6. Founder approval is required before final merge or release.

## Current operating objective

Build a local Figma plugin that can generate editable ionPAY screens from JSON packs, avoiding Figma MCP rate limits while keeping all generated design work traceable.

## Subfolders

- `figma-screen-builder/` — local Figma plugin MVP.
- `figma-screen-builder/packs/` — JSON screen packs for normal and `#ascii` styles.

## Non-goals

- No banking integration.
- No real money.
- No production release.
- No hidden USDT surface in V1.
- No conversion enablement in V1.
- No wallet/ledger/auth/backend change.

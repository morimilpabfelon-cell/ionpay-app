# Code-Driven Design Workflow — ionPAY

## Purpose

ionPAY design should not remain as static images.

The UI/UX Execution Agent should maintain a living design system that can be expressed as:

1. Figma-generated editable screens.
2. Design tokens.
3. Component specifications.
4. Static coded prototypes.
5. Implementation handoff documents.

This allows the product to move from visual design to real app code without losing hierarchy, interaction intent, responsive behavior or financial safety cues.

## Three code layers

### 1. Design tooling code

Located inside:

```text
design-ops/ionpay-uiux-agent/
```

Purpose:

- generate Figma screens;
- define visual tokens;
- build static prototypes;
- document responsive behavior;
- prepare handoffs.

This code is safe as design tooling because it does not touch production app logic.

### 2. Interface implementation code

Eventually located inside app frontend files such as:

```text
src/
```

Purpose:

- implement approved UI components;
- connect frontend states to backend truth;
- render user-facing flows;
- handle real error, loading, pending and success states.

This requires Scope Guardian and Software Engineer routing before work starts.

### 3. Financial logic code

Located in backend/server/ledger/auth/payment logic.

Purpose:

- balances;
- transfers;
- payment requests;
- ledger entries;
- authentication;
- financial correctness.

The UI/UX Execution Agent does not approve this layer.

## Current workflow

```text
Design intent
  -> Design tokens
  -> Figma plugin generation
  -> Static responsive prototype
  -> Component specs
  -> Handoff
  -> Implementation gate
```

## Implementation rule

A coded prototype is not production code.

It can guide implementation, but it does not authorize merge, release, financial behavior or app runtime changes.

## Why this matters

A payments app needs tight alignment between design and code because users must understand:

- available balance;
- action being performed;
- pending vs completed states;
- proof/receipt availability;
- limits and security;
- demo/design states vs real backend states.

The coded design layer helps preserve this clarity before production implementation begins.

# Implementation Bridge — From UI/UX Design Code to App Code

## Purpose

This document explains how ionPAY design artifacts become production UI safely.

The UI/UX operation center can produce code, but that code is design code unless explicitly routed into implementation.

## Source artifacts

Implementation can be informed by:

- Figma plugin output;
- design tokens;
- component specifications;
- responsive prototypes;
- module/device matrix screens;
- UI/UX handoff notes.

## Not implementation by default

None of the following are production by default:

- `design-ops/ionpay-uiux-agent/figma-screen-builder/`;
- `design-ops/ionpay-uiux-agent/design-tokens/`;
- `design-ops/ionpay-uiux-agent/component-specs/`;
- `design-ops/ionpay-uiux-agent/prototypes/`.

They are design inputs.

## Conversion process

```text
Design artifact
  -> UI/UX handoff
  -> Agent Orchestrator routing
  -> Scope Guardian gate
  -> Software Engineer implementation plan
  -> Financial Safety review if needed
  -> Frontend Surface review
  -> Founder approval
  -> app code PR
```

## Allowed implementation mapping

When implementation is authorized, design artifacts may map to:

| Design artifact | Potential app target |
|---|---|
| tokens.css | shared CSS variables or design token module |
| Balance Card spec | React component for wallet summary |
| Action Grid spec | React component for primary actions |
| Receipt Card spec | receipt/activity UI component |
| Responsive prototype | CSS layout reference |
| Figma generated screens | visual acceptance reference |

## Financial safety rule

Any component that shows money, payment execution, balances, receipts, activity, transfer state, request payment state or success state requires financial-safety review before production use.

## False-success rule

No implementation may show completed, paid, received, confirmed or successful states unless the frontend state is backed by backend truth.

## Final rule

Design code can guide app code. It cannot bypass product gates.

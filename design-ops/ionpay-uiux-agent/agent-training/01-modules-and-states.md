# 01 — Modules and Financial States

## Purpose

This lesson teaches agents how to reason about ionPAY modules and states.

A module is not just a screen. It is a product capability with states, risks, device behavior and implementation gates.

## Core distinction

```text
Screen = what the user sees.
Module = what product capability the screen belongs to.
State = what condition the module is showing.
```

Example:

```text
Module: Payment Result
Screen: Result detail
States: pending, confirmed, failed, cancelled
Risk: critical
```

## Required state language

Money-related modules must never use vague state language.

Avoid:

- Done.
- Ready.
- Finished.
- It worked.
- Success without proof.

Use explicit state language:

- Pending.
- Processing.
- Confirmed by backend.
- Failed.
- Cancelled.
- Receipt unavailable.
- Trace ID visible.

## High-risk modules

The following require extra caution:

- Home Wallet.
- Balance Detail.
- Payment Confirmation.
- Payment Result.
- Receive QR.
- Request Payment.
- QR Scanner.
- Activity Detail.
- Receipt Center.
- Merchant Collect.
- Error / Pending states.

## Agent decision rule

Before implementing or approving any visual artifact, ask:

1. Does this show money?
2. Does this imply payment movement?
3. Does this show success?
4. Does this show a receipt?
5. Does this show a balance?
6. Could the user misunderstand this as backend-confirmed?

If yes to any, Financial Safety review is required before production implementation.

## Device rule

Phones prioritize one action at a time.

Tablets can show context and detail together, but must not expose hidden V1 features just because there is more space.

## Training output

Agents should use `module-specs/MODULE_MATRIX.md` and `module-specs/v1-module-matrix.json` as the source for design sequencing and state coverage.

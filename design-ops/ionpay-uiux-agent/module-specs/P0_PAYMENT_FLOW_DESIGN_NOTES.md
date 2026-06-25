# P0 Payment Flow Design Notes

## Purpose

This document defines the first critical ionPAY UI/UX flow to design before implementation: payment from intent to proof.

This is design-only. It does not authorize app code, backend changes, ledger changes or release behavior.

## Covered modules

1. Home Wallet.
2. Send Contact.
3. Send Amount.
4. Payment Method.
5. Payment Confirmation.
6. Payment Result.
7. Receipt Center.
8. Activity Detail.
9. Error / Pending states.

## Flow map

```text
Home Wallet
  -> Choose action: Pagar / Enviar
  -> Select recipient or scan QR
  -> Enter amount
  -> Review confirmation
  -> Submit action
  -> Pending state
  -> Backend-confirmed result
  -> Receipt / activity detail
```

## Required screen states

### 1. Home Wallet

Required states:

- loading balance;
- available PEN balance;
- empty wallet;
- backend unavailable;
- action disabled.

Safety note:

Balance is only real when backend-confirmed.

### 2. Send Amount

Required states:

- amount empty;
- valid amount;
- invalid amount;
- above limit;
- insufficient balance;
- continue disabled.

Safety note:

Do not imply that entering an amount reserves or moves money.

### 3. Payment Confirmation

Required states:

- review ready;
- waiting for user confirmation;
- submit disabled;
- risk copy visible;
- cancellation available.

Safety note:

Confirmation screen is not success.

### 4. Payment Result

Required states:

- pending;
- confirmed;
- failed;
- cancelled;
- unknown / needs refresh.

Safety note:

Only backend-confirmed state may use completed/confirmed language.

### 5. Receipt

Required states:

- receipt ready;
- receipt unavailable;
- trace ID visible;
- share/save actions;
- verification route.

Safety note:

Receipt must not appear before backend confirmation.

## Phone layout rules

- One primary action per screen.
- Confirmation button fixed near bottom but away from gesture area.
- Amount and counterparty must be visible without scrolling.
- Pending and failure copy must be direct.
- Receipt should prioritize amount, status and trace ID.

## Tablet layout rules

- Use split view: list/context on left, detail/proof on right.
- Payment confirmation can show recipient, amount and risk copy side by side.
- Receipt center can show activity list and receipt detail together.
- Merchant payment review can use tablet landscape as primary reference.

## Copy rules

Use explicit language:

- `Pendiente`
- `Procesando`
- `Confirmado por ionPAY`
- `Fallido`
- `Cancelado`
- `Comprobante disponible`
- `Comprobante no disponible`

Avoid:

- `Listo`
- `Hecho`
- `Ya está`
- `Éxito` without confirmation source
- generic celebratory success copy

## Component requirements

Required components:

1. Balance Card.
2. Action Grid.
3. Recipient Row.
4. Amount Input Panel.
5. Payment Confirmation Panel.
6. Status Banner.
7. Receipt Card.
8. Proof Row.
9. Error Recovery Card.
10. Terminal Proof Block.

## Implementation gates

This flow is critical.

Before any production implementation:

1. Agent Orchestrator routing.
2. Scope Guardian classification.
3. Software Engineer implementation plan.
4. Financial Safety Reviewer.
5. Frontend Surface Reviewer.
6. Founder approval.

## Design status

Ready for prototype expansion.

Not implementation-ready yet.

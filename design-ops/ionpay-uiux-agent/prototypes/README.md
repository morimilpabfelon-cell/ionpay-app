# ionPAY UI/UX Prototypes

This folder contains design-only coded prototypes.

They are used to test visual hierarchy, responsive behavior, state language and component structure before implementation.

## Rules

- Prototypes do not connect to backend.
- Prototypes do not handle real money.
- Prototypes do not modify app code.
- Prototypes are not production implementation.
- Generated UI requires gates before becoming real app code.

## Current prototypes

- `responsive-shell.html` — static responsive shell showing phone/tablet layout direction.
- `payment-flow.html` — P0 payment flow prototype covering home wallet, amount entry, confirmation, pending, confirmed, failed and receipt/proof states.

## Critical warning

`payment-flow.html` contains success, receipt and proof visuals for design review only.

Production implementation must not show completed or confirmed states unless backend truth confirms the transaction.

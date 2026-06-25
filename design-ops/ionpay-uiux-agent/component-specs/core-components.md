# Core Component Specifications — ionPAY

## App Shell

Purpose: provide stable navigation and product identity across mobile and tablet.

Required elements:

- brand mark / ionPAY label;
- safe status area;
- page title;
- primary content area;
- bottom navigation on phones;
- side or split navigation on tablets when useful.

Risk note: navigation must not expose hidden V1 features such as public USDT or conversion as primary actions.

## Balance Card

Purpose: show available wallet value clearly.

Required elements:

- currency label;
- available balance;
- account state;
- primary actions nearby;
- clear distinction between demo/design values and backend-confirmed values.

Risk note: balance should never appear as real unless bound to backend truth.

## Action Grid

Purpose: expose frequent actions without overwhelming the user.

Primary actions:

- Pagar;
- Cobrar;
- Enviar;
- Historial.

Secondary actions only after scope approval:

- Convert;
- IonExchange;
- Card;
- advanced merchant flows.

## Payment Confirmation Panel

Purpose: make the user understand before executing an action.

Required elements:

- recipient or commerce name;
- amount;
- source wallet;
- fee status if applicable;
- risk text;
- explicit confirmation button;
- cancel/back action.

Risk note: confirmation is not success.

## Receipt Card

Purpose: show proof after backend-confirmed completion.

Required elements:

- status;
- amount;
- counterparty;
- timestamp;
- trace/reference ID;
- share/save actions;
- visible state label.

Risk note: receipt must not appear before backend confirms completion.

## Proof Row

Purpose: make hidden backend states visible to the user.

Common labels:

- Trace ID ready;
- Receipt state visible;
- No false success;
- Backend confirmed;
- Pending review.

## Terminal / ASCII Proof Panel

Purpose: create a technical-verification visual language for receipts, security and debug-like proof states.

Use for:

- receipt detail;
- traceability screens;
- security state;
- system verification;
- internal or advanced user proof views.

Do not use as the primary onboarding or basic wallet style.

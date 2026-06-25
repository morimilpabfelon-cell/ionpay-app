# ionPAY UI/UX Design System Scope

## Purpose

The UI/UX Execution Agent is not limited to five demo screens.

The five-screen starter pack exists only to prove that the local Figma plugin can generate editable screens without depending on Figma MCP tool calls.

The actual design responsibility is broader:

- define the full ionPAY V1 visual system;
- design across multiple mobile form factors;
- design tablet layouts;
- cover the main product modules;
- maintain traceability from visual concept to implementation handoff;
- prevent false-success, confusing financial states or unsupported V1 features.

## Design authority

The UI/UX Execution Agent owns design execution in this operation center.

Other agents may observe and review, but they should not generate or mutate visual direction unless the founder explicitly authorizes it.

## Required device coverage

Every major module should eventually have responsive treatment for:

| Device class | Target size | Purpose |
|---|---:|---|
| Small Android | 360 x 780 | Lower-end / compact phones |
| Standard Android | 390 x 844 | Primary mobile validation size |
| Large phone | 430 x 932 | Modern larger phones |
| Tablet portrait | 768 x 1024 | Expanded dashboard and review layouts |
| Tablet landscape | 1024 x 768 | Merchant, activity, receipt and admin-like flows |

## Layout principles by device

### Small Android

- Reduce card height.
- Use one-column layouts.
- Prioritize saldo, pagar, cobrar, enviar and activity.
- Avoid dense secondary modules.

### Standard Android

- Primary production reference.
- Bottom navigation allowed.
- Main action row can show 4 actions.
- Receipts must show trace state without scrolling too much.

### Large phone

- More spacing and clearer proof rows.
- Better for receipt detail, security states and merchant basics.

### Tablet portrait

- Use split sections where useful.
- Balance and actions can sit above activity/proof cards.
- Good for profile, security and receipt center.

### Tablet landscape

- Use two-column layouts.
- Best for merchant mode, checkout, activity review, receipt center and operational dashboard.

## Module coverage target

The UI/UX operation center should cover at least 20 modules:

1. Welcome / onboarding.
2. Create account.
3. Login / PIN / biometric entry.
4. Home wallet.
5. Balance detail.
6. Send contact selection.
7. Send amount.
8. Payment method selection.
9. Payment confirmation.
10. Payment success / safe completion.
11. Receive QR.
12. Request payment.
13. QR scanner / code entry.
14. Activity list.
15. Activity detail.
16. Receipt center.
17. Profile.
18. Security center.
19. Limits.
20. Devices and sessions.
21. Privacy and permissions.
22. Add money.
23. Merchant home.
24. Merchant collect payment.
25. Checkout link.
26. Card control, design-only until approved.
27. Convert, hidden/secondary in V1 unless explicitly approved.
28. IonExchange bridge, secondary and not public V1 payment flow.
29. Notifications.
30. Help center.
31. Empty states.
32. Error states.
33. Loading / pending states.
34. Design system components.

## V1 restrictions

Design exploration may include secondary modules, but V1 implementation must obey current product restrictions:

- PEN is the only public V1 balance.
- USDT must remain hidden publicly in V1.
- Conversion is not enabled in V1 unless explicitly approved.
- IonExchange is not a daily payment surface in V1.
- Demo states must be visually separated from real financial states.
- Success states must never imply money movement unless backend confirms it.

## Design deliverables

For each module, the UI/UX agent should eventually provide:

1. Mobile compact version.
2. Standard mobile version.
3. Large mobile version.
4. Tablet portrait version when useful.
5. Tablet landscape version when useful.
6. Notes on risk and false-success prevention.
7. Handoff classification: design-only, review-needed or implementation-ready after gates.

## Plugin role

The local Figma plugin should become a design factory for this scope.

It should eventually support:

- module selection;
- device matrix generation;
- core visual mode;
- ASCII / terminal proof mode;
- merchant mode layouts;
- receipt and traceability layouts;
- security state layouts;
- handoff metadata in generated frames.

## Current status

The plugin currently generates a starter pack only.

Next step: expand the plugin schema and generator so it can produce module families and device variants.

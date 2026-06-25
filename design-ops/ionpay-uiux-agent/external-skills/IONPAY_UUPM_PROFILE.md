# ionPAY Profile — UI UX Pro Max Adaptation

## Product classification

ionPAY should be treated as a fintech/payment wallet product with merchant-adjacent flows.

Primary external categories adapted:

1. Fintech/Crypto.
2. Banking/Traditional Finance.
3. Financial Dashboard.
4. Marketplace/P2P, only for P2P trust and payment flow references.

## Selected visual direction

ionPAY should not blindly use generic crypto neon.

Recommended direction:

```text
Financial clarity + high-trust minimalism + controlled terminal proof layer
```

## Style stack

### Primary style

- Minimalism / Swiss-style hierarchy.
- Accessible and ethical UI.
- Flat, clear cards.
- High contrast financial states.

### Secondary style

- Dark mode / OLED for proof, receipt and technical states.
- Financial dashboard discipline for merchant/activity views.
- `#ascii` terminal proof layer for receipts, traceability and advanced verification states.

### Avoid

- Overuse of glassmorphism for wallet balances.
- Decorative cyberpunk treatment for daily payment flows.
- Neon-heavy crypto aesthetics in V1.
- Emoji iconography.
- Complex dashboards on small phones.
- Color-only success/error communication.

## Color interpretation

External references recommend dark tech colors, trust colors and vibrant accents for fintech/crypto, and navy/trust blue/gold for banking.

ionPAY adaptation:

- Background: warm off-white for daily usability.
- Primary ink: near-black for financial seriousness.
- Accent: controlled lime for action and proof identity.
- Success/danger: semantic, not decorative.
- Terminal mode: dark panel with lime proof text.

## Typography interpretation

- Use clear sans-serif as primary.
- Prefer tabular numeric treatment for balances, amounts, timers and references.
- Avoid tiny body text under 12px.
- Use strong title hierarchy but avoid oversized vanity headings in transactional screens.

## Interaction interpretation

Every critical flow must show:

1. pre-action confirmation;
2. pending state;
3. backend-confirmed completion state;
4. receipt/proof state;
5. recovery/error route.

## Responsive interpretation

Phone:

- one-column flow;
- bottom navigation;
- primary actions limited;
- secondary modules folded.

Tablet portrait:

- expanded cards;
- split proof/details where useful;
- stronger activity/receipt panels.

Tablet landscape:

- two-column layout;
- merchant and activity dashboards become more useful;
- detail panes can sit beside lists.

## Component priorities

1. Balance card.
2. Action grid.
3. Payment confirmation panel.
4. QR collection panel.
5. Receipt card.
6. Activity row.
7. Proof row.
8. Merchant summary card.
9. Security state card.
10. Terminal proof block.

## Quality checklist

Before any screen is considered ready for implementation handoff:

- Does it show one clear primary action?
- Does it avoid false success?
- Does it distinguish pending and completed states?
- Does it have readable contrast?
- Are touch targets large enough?
- Does it work on phone and tablet?
- Does it avoid exposing hidden V1 features?
- Does it include clear error/recovery behavior where needed?
- Does it map to reusable components?
- Does it preserve ionPAY brand direction instead of generic fintech visuals?

## Status

This profile is a design-reference adaptation only.

It guides the UI/UX Execution Agent and future handoffs, but it does not authorize production implementation.

# External Skill Adapter — UI UX Pro Max

## Source

Repository:

```text
https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
```

Source project: UI UX Pro Max by Next Level Builder.

License: MIT.

## Why this is used

UI UX Pro Max provides a broad design intelligence reference for:

- UI styles;
- product-type design rules;
- color palette selection;
- typography pairing;
- UX quality checks;
- accessibility;
- responsive layout;
- stack-specific implementation guidance.

This is useful for ionPAY because ionPAY requires a professional fintech/payment design system, not isolated mockups.

## How ionPAY uses it

ionPAY does not vendor or copy the full external project in this PR.

The UI/UX Execution Agent uses it as a reference layer to strengthen:

1. design reasoning;
2. product-type fit;
3. accessibility checks;
4. responsive rules;
5. fintech visual language;
6. implementation handoff discipline.

## Key extracted direction for ionPAY

The external skill includes product categories for financial dashboard, fintech/crypto and banking/traditional finance. For ionPAY, the useful overlap is:

- security perception;
- real-time clarity;
- account/wallet overview;
- transaction history;
- payment feedback;
- financial dashboard discipline;
- accessible and ethical design.

## Rules adapted into ionPAY

### Accessibility and interaction

- Minimum contrast target: WCAG AA for normal text.
- Visible focus states.
- Touch targets should stay at least 44 x 44 pt / 48 x 48 dp where possible.
- Avoid hover-only interactions.
- Provide loading, pending and error feedback.

### Responsive

- Mobile-first.
- No horizontal scroll.
- Systematic breakpoints.
- Tablet layout must not simply stretch phone UI.
- Core content appears first on compact screens.

### Style

- Do not mix visual styles randomly.
- Use semantic design tokens instead of raw values in components.
- Avoid emoji as product icons.
- Keep one icon language.
- Use one primary CTA per critical screen.

### React implementation readiness

When the design moves to production React:

- keep components small and focused;
- type props with TypeScript;
- use semantic HTML;
- handle async errors;
- use accessible queries for tests;
- avoid unnecessary state and effects.

## ionPAY-specific override

The external skill is generic. ionPAY must override it where payment safety requires stricter rules.

ionPAY rules win over external recommendations when there is conflict:

- no false success;
- no public USDT in V1;
- no enabled conversion in V1 unless approved;
- no design state presented as real money;
- backend truth controls balances and completed states;
- receipts appear only after confirmed completion.

## Status

Adopted as reference/adaptation for the UI/UX Operation Center.

Not installed as a runtime dependency.

Not used in production app code.

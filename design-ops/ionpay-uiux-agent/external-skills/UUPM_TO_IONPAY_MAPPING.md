# UUPM to ionPAY Mapping

## Purpose

This file maps the external UI UX Pro Max skill concepts to concrete ionPAY UI/UX artifacts.

## Mapping table

| UUPM concept | ionPAY artifact | Applied as |
|---|---|---|
| Product type reasoning | `IONPAY_UUPM_PROFILE.md` | fintech/payment wallet profile |
| Style selection | `DESIGN_SYSTEM_SCOPE.md` | primary and secondary visual direction |
| Color palette selection | `design-tokens/tokens.json` | semantic token layer |
| UX guidelines | `component-specs/core-components.md` | component requirements and risk notes |
| Responsive layout | `prototypes/responsive-shell.html` | phone/tablet prototype behavior |
| Stack-specific React guidance | `IMPLEMENTATION_BRIDGE.md` | future production mapping discipline |
| Accessibility priority | all design handoffs | required before implementation |

## Concrete decisions for ionPAY

### Use

- Minimalism / Swiss hierarchy for daily wallet flows.
- Accessible and ethical interface rules.
- Financial dashboard discipline for activity, merchant and receipt areas.
- Dark/OLED or terminal style only for proof, receipt and technical state layers.
- Semantic tokens.
- Phone-first layout with tablet expansion.

### Avoid

- Overdecorated fintech visuals.
- Generic crypto neon.
- Exposing hidden V1 features as normal navigation.
- Emoji icons.
- Color-only success or error meaning.
- Treating prototypes as production.

## Current action

The UI/UX Operation Center now uses UI UX Pro Max as a reference layer, not as a copied runtime dependency.

The next design expansion should use this mapping when generating:

- more module packs;
- responsive prototypes;
- component specs;
- future implementation handoffs.

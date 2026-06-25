# ionPAY Figma Screen Builder

Local Figma plugin for generating editable ionPAY screens from JSON packs.

This plugin is part of the UI/UX operation center. It is not shipped with the ionPAY app.

## What it does

- Creates editable mobile frames in Figma.
- Generates text layers, cards, buttons, lists, QR placeholders and receipt blocks.
- Supports multiple visual modes through packs.
- Allows large screen sets without relying on ChatGPT → Figma MCP calls.

## What it does not do

- Does not modify the app.
- Does not touch `src/`, `server/`, `android/`, DB, wallet, ledger or auth.
- Does not approve Phase 1.6.
- Does not authorize production implementation.
- Does not handle real user data or real money.

## Install locally in Figma

1. Open Figma desktop.
2. Go to Plugins → Development → Import plugin from manifest.
3. Select:

```text
/design-ops/ionpay-uiux-agent/figma-screen-builder/manifest.json
```

4. Run `ionPAY Screen Builder`.
5. Choose a pack or paste JSON.
6. Type the operational authorization phrase shown in the plugin UI.
7. Generate the editable screens.

## Packs

- `packs/ionpay-v1-core.json` — clean wallet/payment V1 screens.
- `packs/ionpay-v1-ascii.json` — terminal/ASCII visual direction for receipts, logs and technical states.

## Governance

Only the ionPAY UI/UX Execution Agent should author or modify packs unless explicitly authorized by the founder.

Other agents may inspect this folder for context but must not use the plugin output as implementation authorization.

# ionPAY Figma Screen Builder

Local Figma plugin for generating editable ionPAY screens from module packs and device matrices.

This plugin is part of the UI/UX operation center. It is not shipped with the ionPAY app.

## Current MVP behavior

The current MVP generates a multi-device module matrix automatically when the plugin runs.

This is intentional. It makes the plugin usable even while the plugin UI is still basic.

Generated starter modules:

1. Home.
2. Pagar.
3. Cobrar QR.
4. Comprobante.
5. Actividad.
6. Perfil.
7. Merchant.
8. `#ascii Receipt`.

Generated starter devices:

1. Standard Android — 390 x 844.
2. Tablet Portrait — 768 x 1024.
3. Tablet Landscape — 1024 x 768.

The plugin architecture also defines additional target devices:

- Small Android — 360 x 780.
- Large Phone — 430 x 932.

## What it does

- Creates editable Figma frames across phone and tablet sizes.
- Generates text layers, cards, buttons, lists, proof rows and receipt-like states.
- Supports core style and `#ascii` style.
- Generates module families, not isolated demo screens.
- Avoids relying on ChatGPT → Figma MCP calls for bulk screen generation.

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
5. The plugin generates the default module/device matrix automatically.

## Planned next improvement

The UI shell already exists but is intentionally minimal. Next versions should allow:

- selecting target devices;
- selecting modules;
- selecting core or ASCII packs;
- pasting custom JSON;
- generating selected screens only;
- adding stricter design-agent authorization copy;
- exporting pack metadata for handoff.

## Packs

- `packs/ionpay-v1-core.json` — clean wallet/payment V1 screens.
- `packs/ionpay-v1-ascii.json` — terminal/ASCII visual direction for receipts, logs and technical states.

## Governance

Only the ionPAY UI/UX Execution Agent should author or modify packs unless explicitly authorized by the founder.

Other agents may inspect this folder for context but must not use the plugin output as implementation authorization.

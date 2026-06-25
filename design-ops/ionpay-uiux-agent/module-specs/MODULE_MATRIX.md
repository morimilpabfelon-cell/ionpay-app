# ionPAY UI/UX Module Matrix

## Purpose

This matrix converts the broad UI/UX scope into concrete design units.

Each module must be treated as design-only until routed through the implementation bridge.

## Matrix rules

- Every module must define phone and tablet behavior.
- Every money-related module must include pending, error and confirmed states.
- Every receipt/proof module must include visible traceability.
- Every implementation candidate must identify required gates.
- V1 hidden features must stay secondary or non-public.

## Core V1 module matrix

| # | Module | Primary user goal | Required states | Device priority | Financial risk | Required gates before implementation |
|---:|---|---|---|---|---|---|
| 1 | Welcome | Understand ionPAY quickly | default, loading, blocked | phone first | low | Scope + Frontend |
| 2 | Create Account | Start onboarding | form, validation, error, success handoff | phone first | medium | Scope + Engineering + Frontend |
| 3 | Login / PIN | Re-enter securely | PIN, biometric prompt, error, locked | phone first | high | Scope + Engineering + Safety + Frontend |
| 4 | Home Wallet | See available PEN balance | loading, available, empty, error | all devices | high | Scope + Engineering + Safety + Frontend |
| 5 | Balance Detail | Understand wallet value | available, pending, unavailable | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 6 | Send Contact | Choose recipient | list, search, empty, blocked | phone first | medium | Scope + Engineering + Frontend |
| 7 | Send Amount | Enter transfer amount | input, limit warning, invalid, continue | phone first | high | Scope + Engineering + Safety + Frontend |
| 8 | Payment Method | Select source | PEN wallet, unavailable, hidden features | phone first | high | Scope + Engineering + Safety + Frontend |
| 9 | Payment Confirmation | Review before action | review, risk copy, disabled, confirm | all devices | critical | Scope + Engineering + Safety + Frontend + Founder |
| 10 | Payment Result | Show outcome safely | pending, confirmed, failed, cancelled | all devices | critical | Scope + Engineering + Safety + Frontend + Founder |
| 11 | Receive QR | Show QR to collect | amount set, QR visible, expired, cancelled | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 12 | Request Payment | Ask someone to pay | form, link, pending, expired | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 13 | QR Scanner | Scan or enter code | scanner, manual code, permission, error | phone first | high | Scope + Engineering + Safety + Frontend |
| 14 | Activity List | Review movements | list, empty, loading, filter, error | all devices | high | Scope + Engineering + Safety + Frontend |
| 15 | Activity Detail | Inspect one movement | pending, completed, failed, reversed | all devices | high | Scope + Engineering + Safety + Frontend |
| 16 | Receipt Center | Find and verify receipts | list, detail, share, unavailable | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 17 | Profile | Manage account surface | personal info, settings, support | phone/tablet | medium | Scope + Engineering + Frontend |
| 18 | Security Center | Understand protection | sessions, devices, PIN, alerts | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 19 | Limits | Understand usage limits | daily, monthly, exceeded, pending review | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 20 | Devices & Sessions | Manage device trust | current, list, revoke, error | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 21 | Add Money | Prepare wallet funding | method list, unavailable, pending | phone/tablet | high | Scope + Engineering + Safety + Frontend |
| 22 | Merchant Home | See commerce snapshot | today, pending, settled, empty | tablet priority | high | Scope + Engineering + Safety + Frontend |
| 23 | Merchant Collect | Collect customer payment | amount, QR, pending, confirmed | tablet/phone | critical | Scope + Engineering + Safety + Frontend + Founder |
| 24 | Checkout Link | Create payment link | created, copied, pending, expired | tablet/phone | high | Scope + Engineering + Safety + Frontend |
| 25 | Notifications | Show relevant updates | list, unread, empty, error | phone/tablet | medium | Scope + Engineering + Frontend |
| 26 | Help Center | Support user recovery | articles, contact, issue report | phone/tablet | low | Scope + Frontend |
| 27 | Empty States | Explain absence clearly | no activity, no receipt, no device | all devices | medium | Scope + Frontend |
| 28 | Error States | Recover from problems | network, validation, blocked, retry | all devices | high | Scope + Engineering + Safety + Frontend |
| 29 | Loading / Pending States | Prevent uncertainty | skeleton, spinner, pending proof | all devices | high | Scope + Engineering + Safety + Frontend |
| 30 | Design System Components | Reusable UI foundation | default, hover, pressed, disabled | all devices | medium | Scope + Frontend |

## Secondary / hidden V1 modules

These may be designed as future or internal references, but must not become public V1 surfaces without explicit founder approval.

| Module | V1 status | Rule |
|---|---|---|
| Convert | hidden / not enabled | Do not present as available daily action |
| USDT public balance | hidden | Do not expose publicly in V1 |
| IonExchange bridge | secondary future | Do not make daily payment surface in V1 |
| Card Control | design-only | Requires separate scope and safety review |

## Design sequence

Recommended design order:

1. Home Wallet.
2. Payment Confirmation.
3. Payment Result.
4. Receipt Center.
5. Activity List / Detail.
6. Receive QR.
7. Request Payment.
8. Merchant Collect.
9. Security Center.
10. Error / Pending states.

This order prioritizes trust and payment-state clarity before secondary surfaces.

## Summary

Describe the exact change.

## Scope classification

Select one:

- [ ] Product UI / frontend-only
- [ ] Operational automation
- [ ] Documentation / memory
- [ ] Backend / API
- [ ] Ledger / financial safety
- [ ] DB / schema / migrations
- [ ] Android native
- [ ] Package / lockfile
- [ ] Production / release

## Changed files

List changed files or folders:

```text

```

## Blocked surfaces check

Confirm:

- [ ] No backend change unless explicitly authorized
- [ ] No ledger change unless explicitly authorized
- [ ] No DB/schema/migration change unless explicitly authorized
- [ ] No auth/payment guard change unless explicitly authorized
- [ ] No Android native change unless explicitly authorized
- [ ] No package or lockfile change unless explicitly authorized
- [ ] No production / real-money behavior change unless explicitly authorized
- [ ] No QR scanner / camera / public USDT / conversion scope unless explicitly authorized

## Validation

Paste local validation:

```text
pnpm install --frozen-lockfile:
pnpm build:
pnpm api:test:
pnpm android:sync:
git diff --check:
git status:
```

## Gate approvals required

Select as applicable:

- [ ] Scope Guardian
- [ ] Financial Safety Reviewer / Security & Ledger Auditor
- [ ] Frontend Surface Reviewer
- [ ] Founder final approval
- [ ] Not applicable — operational automation only

## Notes

Add any constraints, risks, or explicit non-goals.

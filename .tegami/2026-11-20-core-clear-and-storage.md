---
packages:
  '@c15t/core': patch
---

### Fix record clearing, revocation storage protection and early body script mounting

- `clear()` now removes the Google Additional Consent `addtl_consent` cookie and localStorage entry alongside `euconsent-v2` and `c15t-iab-authority-v1`, and revocation cleanup preserves `addtl_consent` even when a configured pattern matches it.
- Server-rendered pages mounted with `skipHydration: true` now check the stored clear epoch and void seeded choices, notice dismissals and vendor choices recorded before another tab cleared consent. The seeded subject keeps its ID and drops the identity linked to it, as after any clear.
- Revocation cleanup in `sessionStorage` now preserves the `c15t-journey-v1` tab journey ID so `journey: 'tab'` runtimes keep the same journey across pages.
- Mounting a `target: 'body'` script before `<body>` exists now falls back to `<head>` instead of throwing a `TypeError`.

---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Fix clearing, revocation cleanup and early script mounting

- `clear()` also removes the `addtl_consent` cookie and localStorage entry.
- A server-rendered page drops a choice that another tab cleared and adopts
  any subject saved after that clear.
- Revocation cleanup keeps the tab journey ID and `addtl_consent`.
- A `target: 'body'` script mounted before `<body>` exists goes to `<head>`
  instead of throwing.

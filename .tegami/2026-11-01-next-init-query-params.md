---
packages:
  "@c15t/core": patch
---

### Fix `/init` query parameters in Next.js route handlers

`createConsentRoute` handlers in the Next.js App Router now read `/init`
query parameters on Node 24 and later.

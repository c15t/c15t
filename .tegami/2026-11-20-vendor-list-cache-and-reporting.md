---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/schema': patch
---

### Fix the vendor list fallback, prefetch detection and option warnings

- A cached Global Vendor List is served when a refresh fails, and a failed
  fetch is retried after 60 seconds.
- Prefetch requests are detected from more headers, so they no longer count as
  visits in session reports.
- Changing any read-once provider option after mount warns in development.

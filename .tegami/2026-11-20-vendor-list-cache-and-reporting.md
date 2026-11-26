---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
---

### Fix the vendor list fallback, prefetch detection and option warnings

- A cached Global Vendor List is served when a refresh fails, and a failed
  fetch is retried after 60 seconds.
- Prefetch requests are detected from more headers and forwarded by hosted SSR
  renders and same-origin consent proxies, so they no longer count as visits
  in session reports.
- Changing any read-once provider option after mount warns in development.

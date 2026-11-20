---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/schema': patch
---

### Fix vendor list fallback, prefetch filtering, and provider option warnings

- Keep serving the last cached Global Vendor List when a refresh throws or times out, and back off for 60 seconds after any failed fetch so an outage does not block or repeat on every init.
- Share one `SPECULATION_HEADERS` list between `isSpeculativeRequest` and React SSR header forwarding, adding `x-middleware-prefetch` to detection and forwarding `x-purpose` and `x-moz` so prefetches do not count as visits in session reports.
- Warn once in development whenever any read-once provider option changes after mount (including `iab`, `gpp`, `clearOnRevocation`, `journey`, `policyRules`, `windowDebug`, and `pkg`), backed by a compile-time check against the provider options type.

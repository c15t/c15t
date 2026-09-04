---
'c15t': patch
---

Make persistence hydration read-only. Reading stored consent at startup no longer rewrites `consentInfo.time` to now, mirrors a cookie into localStorage (or the reverse), or migrates the legacy `privacy-consent-storage` key. A returning visitor's original choice time and metadata survive every page load. Explicit accept, reject, and save still persist locally, including repeat saves (even a `save()` with no input) and saves whose remote call fails, and a `hydrate()` call flushes a queued write before it reads so a fresh choice is never lost.

`readStoredConsent(config)` is the new pure reader behind hydration. `getConsentFromStorage` keeps its migrate-and-sync behavior for callers that want it.

---
'c15t': patch
---

Make persistence storage hydration read-only. Reading stored consent into the kernel, at startup or through `hydrate()`, no longer rewrites `consentInfo.time` to now, mirrors a cookie into localStorage (or the reverse), or migrates the legacy `privacy-consent-storage` key. Explicit accept, reject, and save still persist locally, including repeat saves (even a `save()` with no input) and saves whose remote call fails, and a `hydrate()` call flushes a queued write before it reads so a fresh choice is never lost.

This covers the storage read only. Other consent-state changes after hydration, such as a policy applied during `init` or a direct `kernel.set.consent(...)`, still schedule a write and refresh the stored time.

Fix persistence writes ignoring `storageConfig`. The config was passed to the cookie layer as cookie options, so writes went to the default `c15t` key with default domain and expiry while reads used the custom key. A rejection saved under a custom `storageKey` now survives `hydrate()` and the next page load.

Make persistence `clear()` use the configured storage key too. Clearing a custom key removes its cookie and localStorage receipt while preserving data under the default `c15t` key.

`readStoredConsent(config)` is the new pure reader behind hydration. `getConsentFromStorage` keeps its migrate-and-sync behavior for callers that want it.

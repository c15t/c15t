---
'c15t': patch
---

Skip the initial `/init` request when the server already resolved the policy. A runtime built with a `prefetch` that carries `initialPolicy` and `initialPolicyDecision` now starts without asking the backend for an answer it already has, which removes one request per page load from every SSR route. `reinit()`, language and override changes, and apps without a prefetch are unaffected, and `onBannerFetched` still fires with the prefetched policy. `hasResolvedPrefetch()` is exported from `c15t/runtime` for frameworks that need the same check.

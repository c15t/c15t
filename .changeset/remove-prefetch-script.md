---
"@c15t/core": major
"@c15t/nextjs": major
---

Remove `buildPrefetchScript` and `C15tPrefetch`. The v2 prefetch script started `/init` before hydration and parked the promise on `window` for the store to adopt; nothing in v3 adopts it, so the script only added a second `/init` request. Use `prefetchInitialConsent` on dynamic routes and manifest mode on static ones.

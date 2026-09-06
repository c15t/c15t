---
"@c15t/nextjs": major
---

Remove `C15tPrefetch` and the `buildPrefetchScript` re-export. The v2 Next.js prefetch component started `/init` before hydration and parked the promise on `window` for the store to adopt; the Next.js v3 boundary does not adopt it, so the component only added a second `/init` request. Use `prefetchInitialConsent` on dynamic routes and manifest mode on static ones.

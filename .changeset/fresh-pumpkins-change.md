---
'c15t': patch
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/cli': patch
---

Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

- `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
- `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
- `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
- `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

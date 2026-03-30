---
"c15t": patch
"@c15t/nextjs": patch
"@c15t/ui": patch
---

Add browser prefetch utilities for faster consent banner visibility

- New `buildPrefetchScript()` and `getPrefetchedInitialData()` in `c15t` core to start the `/init` request before framework hydration
- New `C15tPrefetch` component in `@c15t/nextjs` using `next/script` with `beforeInteractive` strategy for static-route-compatible prefetching
- Tuned default motion tokens (fast: 80ms, normal: 150ms, slow: 200ms) and replaced hardcoded CSS durations with theme variables

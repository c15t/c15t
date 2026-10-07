---
packages:
  "@c15t/react": patch
  "@c15t/core": patch
  c15t: patch
---

### `ConsentProvider` requests `/init` sooner

In a client render, `ConsentProvider` with `hosted()` and no `prefetch` now sends `/init` during its first render instead of after mount, so the banner shows sooner (about 38 ms on a throttled mobile profile). Server renders, hydration and apps with a `prefetch` or `ConsentRoot` keep the previous timing.

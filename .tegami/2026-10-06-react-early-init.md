---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### `ConsentProvider` requests `/init` sooner

In a client render, `ConsentProvider` with `hosted()` and no `prefetch` sends
`/init` during its first render instead of after mount, so the banner shows
sooner (about 38 ms on a throttled mobile profile). Server renders, hydration
and apps with a `prefetch` or `ConsentRoot` keep the previous timing.

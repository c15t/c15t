---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Stream the banner before hydration

When `ConsentRoot`'s `state` (or `prefetch`) is a promise, `ConsentBanner` now
renders on the server once it resolves and follows the page in a later chunk of
the same response, visible before hydration. It shows only when the resolved
policy calls for a banner; otherwise it mounts after hydration as before. Set
`streamBanner: false` in the provider options to keep the old behavior.

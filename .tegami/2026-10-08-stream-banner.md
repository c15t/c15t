---
packages:
  '@c15t/core': patch
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  c15t: minor
---

### Stream the banner before hydration

When `ConsentRoot`'s `state` (or `prefetch`) is a promise, `ConsentBanner` now
renders on the server once it resolves and follows the page in a later chunk of
the same response, visible before hydration. It shows only when the resolved
policy calls for a banner; otherwise it mounts after hydration as before. Set
`streamBanner: false` in the provider options to keep the old behavior.

---
packages:
  '@c15t/core': patch
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  c15t: minor
---

### Stream the banner before hydration

When `prefetch` (or `ConsentRoot`'s `state`) is a promise, `ConsentBanner` now
renders on the server once it resolves and arrives in a later chunk of the same
response, so it is visible before the page hydrates. The page still streams at
once. The banner shows only when the resolved policy shows one to this visitor;
without a policy, with a rejected promise, or with an experiment configured, it
mounts after hydration as before.

The banner hydrates in place: the kernel adopts the streamed config before the
banner commits, so it does not blink, and a choice made right after hydration is
recorded against that policy. The browser still sends no `/init`.

Set `streamBanner: false` in the provider options to mount the banner after
hydration instead.

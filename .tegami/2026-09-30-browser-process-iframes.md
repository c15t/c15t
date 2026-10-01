---
packages:
  '@c15t/browser': patch
  '@c15t/core': patch
---

### Check iframes on demand with `processIframes()`

`iframeBlocker: { disableAutomaticBlocking: true }` is now usable outside React. The consent runtime from `@c15t/core/runtime` has a `processIframes()` method, and `@c15t/browser` exposes it as `client.processIframes()` and `c15t.processIframes()`. Each call pauses gated frames (`data-category` or `data-vendor`) that consent does not allow and restores the ones it does. With automatic blocking on, the blocker still does this by itself. `c15t.push(['processIframes'])` runs once the policy has resolved.

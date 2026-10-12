---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Keep blocking iframes past an unreadable iframe or an empty category

The iframe blocker skips an iframe the page can't read. Before, one such
iframe made `createIframeBlocker` throw on startup, and other gated iframes
loaded. The on-demand watcher in `@c15t/react` had the same bug.

An empty `data-category` keeps the iframe blocked and logs a warning. Before,
the iframe loaded without consent.

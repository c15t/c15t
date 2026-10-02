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

The iframe blocker now skips an iframe the page can't read, not only an unreadable node that contains it. Before, one such iframe made `createIframeBlocker` throw on startup and stopped each later pass early, so other consent-gated iframes loaded. The on-demand watcher in `@c15t/react` had the same gap.

An empty `data-category` is now treated like an unknown category: the iframe stays blocked and logs a console warning. Before, it counted as no category, so the iframe loaded without consent.

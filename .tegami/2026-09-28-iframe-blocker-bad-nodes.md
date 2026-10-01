---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Keep blocking iframes when one node on the page is bad

The iframe blocker could let consent-gated iframes load after it hit a node the page can't read, such as one Firefox reports as "Permission denied to access property". It skipped every iframe in that `MutationObserver` batch, including ones added before the bad node. The on-demand watcher in `@c15t/react` had the same gap. Both now skip the unreadable node and gate the rest.

An iframe with an invalid `data-category` no longer throws. Before, one such iframe stopped the blocker from starting and made every later pass stop early, so revoking consent left other gated iframes loaded. It now stays blocked and logs a console warning, the same way the on-demand watcher already held it.

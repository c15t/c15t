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

The iframe blocker and the on-demand watcher in `@c15t/react` could let
consent-gated iframes load after hitting a node the page can't read, such as one
Firefox reports as "Permission denied to access property". Both now skip that
node and gate the rest. An iframe with an invalid `data-category` stays blocked
with a console warning instead of stopping the blocker, which had left other
gated iframes loaded after revocation.

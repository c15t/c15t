---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Fetch a `manifestURL` in the browser from the plain Vue plugin

With the plain Vue plugin, setting `manifestURL` without `manifest` now selects client manifest mode: the browser fetches that manifest and resolves the policy itself. Before, it selected server mode and called `/api/c15t/init`, a route only the Nuxt module registers. Nuxt still treats a `manifestURL` without `manifest` as server mode.

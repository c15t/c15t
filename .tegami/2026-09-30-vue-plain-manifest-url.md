---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Fetch a `manifestURL` in the browser from the plain Vue plugin

With the plain Vue plugin, setting `manifestURL` without `manifest` now selects client manifest mode: the browser fetches that manifest and resolves the policy itself. Before, it selected server mode and called `/api/c15t/init`, a route only the Nuxt module registers. The Nuxt module is unchanged: its `manifest` option defaults to `false`, so a `manifestURL` there needs `manifest: 'server'` or `manifest: 'client'` as well.

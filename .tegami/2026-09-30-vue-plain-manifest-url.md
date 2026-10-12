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

With the plain Vue plugin, setting `manifestURL` without `manifest` selects
client manifest mode, so the browser fetches the manifest itself. Before, it
called `/api/c15t/init`, a route only the Nuxt module registers. In Nuxt, a
`manifestURL` still needs `manifest: 'server'` or `manifest: 'client'`.

---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Resolve Nuxt visitors in the browser on prerendered and cached routes

Nuxt pages that are prerendered, or cached by a `cache`, `swr`, `isr` or
`prerender` route rule, no longer carry the consent state of the request that
rendered them. They render without the banner, and the browser fetches the
visitor's policy and stored choice after hydration. Before, every visitor got
the build-time or first visitor's result, and a visitor who rejected saw the
banner again after a reload.

A newer denial in localStorage also wins over records read from the request
cookie.

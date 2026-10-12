---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Stop Nuxt pages from downloading every locale on first load

Nuxt 4 builds downloaded the all-locale translations chunk (about 57 KB gzip) on
every page's first load, in every mode, though only client manifest mode uses
it. Server manifest and hosted modes no longer download it, and client manifest
mode still preloads the resolver. Plain Vue apps built with Vite were not
affected.

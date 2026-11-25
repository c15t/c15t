---
packages:
  "@c15t/vue": minor
---

### Support Nuxt 5 nightly server builds

The Nuxt module now registers portable `nuxt/server` handlers and Nitro 3
plugin variants, while keeping the existing Nitro 2 files for Nuxt 4. The
default server-rendered manifest route, DevTools tab and early `/init` script
now work with Nuxt 5 nightly builds without Nuxt's Nitro 2 compatibility layer.

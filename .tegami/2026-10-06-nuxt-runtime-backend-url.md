---
packages:
  '@c15t/vue': patch
---

### Nuxt server routes follow `NUXT_PUBLIC_C15T_BACKEND_URL`

Setting `NUXT_PUBLIC_C15T_BACKEND_URL` when a built Nuxt app starts now moves
the module's `/api/c15t/init` and `/api/c15t/manifest` routes to that backend
too. Before, the browser used the new URL while the routes kept the one from
build time, unless you also set `NUXT_C15T_BACKEND_URL`.
`NUXT_PUBLIC_C15T_MANIFEST_URL` had the same problem and is fixed the same way.

`NUXT_C15T_BACKEND_URL` and `NUXT_C15T_MANIFEST_URL` still work. Set them only
when those routes should reach the backend at an address the browser does not
use, such as an internal hostname.

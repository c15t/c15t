---
packages:
  '@c15t/vue': patch
---

### Nuxt server routes follow `NUXT_PUBLIC_C15T_BACKEND_URL`

Setting `NUXT_PUBLIC_C15T_BACKEND_URL` when a built Nuxt app starts moves the
module's `/api/c15t/init` and `/api/c15t/manifest` routes to that backend too.
Before, those routes kept the build-time URL. `NUXT_PUBLIC_C15T_MANIFEST_URL`
works the same way.

Set `NUXT_C15T_BACKEND_URL` or `NUXT_C15T_MANIFEST_URL` only when the routes
should reach the backend at an address the browser does not use, such as an
internal hostname.

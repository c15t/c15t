---
packages:
  '@c15t/vue': patch
---

### Keep a Nuxt `manifestSnapshot` intact

A `manifestSnapshot` set under the `c15t` key in `nuxt.config.ts` passed
through public runtime config. Nitro replaces every `null` there with an empty
string during the build, so each policy failed validation and no banner
showed. The snapshot was also sent in every page's payload.

The module now keeps it out of runtime config. The app bundles it unchanged,
and the server's `/api/c15t/manifest` route serves it wherever the module
registers that route: in server manifest mode, and in client mode without a
`manifestURL`.

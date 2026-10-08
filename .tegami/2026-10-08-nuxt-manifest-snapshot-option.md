---
packages:
  '@c15t/vue': patch
---

### Keep a Nuxt `manifestSnapshot` intact

A `manifestSnapshot` set under the `c15t` key in `nuxt.config.ts` passed
through public runtime config. Nitro replaces every `null` there with an empty
string during the build, so each policy failed validation and no banner
showed. The snapshot was also sent in every page's payload.

The module now keeps it out of runtime config. In client manifest mode the app
bundles it unchanged; the server's `/api/c15t/manifest` route serves it in
every mode.

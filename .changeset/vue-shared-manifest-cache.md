---
'@c15t/vue': patch
---

The Nuxt manifest and init routes now use the shared manifest cache from `@c15t/core/transports/manifest-cache` instead of a module-local copy. Behaviour is unchanged.

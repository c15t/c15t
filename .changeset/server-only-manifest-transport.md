---
'@c15t/core': patch
'@c15t/nextjs': patch
'@c15t/vue': patch
---

Import `createManifestTransport` from the new server-oriented `@c15t/core/v3/transports/manifest` entrypoint instead of `@c15t/core/v3`. Next.js now uses that entrypoint, and Nuxt server manifest mode initializes through its same-origin route while client manifest mode loads the resolver and translation bundle only when selected.

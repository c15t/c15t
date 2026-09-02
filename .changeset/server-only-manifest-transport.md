---
'@c15t/core': patch
'@c15t/nextjs': patch
'@c15t/vue': patch
---

Import `createManifestTransport` from the new server-oriented `@c15t/core/v3/transports/manifest` entrypoint instead of `@c15t/core/v3`. The shared schema resolver now receives the full translation map only at manifest-resolution boundaries, keeping all languages out of unrelated core bundles. Next.js uses the server entrypoint, while Nuxt server manifest mode initializes through its same-origin route and client manifest mode loads the resolver and translation bundle only when selected.

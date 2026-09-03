---
'c15t': patch
'@c15t/core': patch
'@c15t/nextjs': patch
'@c15t/vue': patch
---

Import `createManifestTransport` from the server-oriented `@c15t/core/transports/manifest` entrypoint (also `c15t/transports/manifest` on the umbrella package) instead of the package root. The shared schema resolver now receives the full translation map only at manifest-resolution boundaries, keeping all languages out of unrelated core bundles. Next.js uses the server entrypoint, while Nuxt server manifest mode initializes through its same-origin route and client manifest mode loads the resolver and translation bundle only when selected.

`createHostedTransport` gains an `assertDecisionInputs` option that sends the resolved policy id, fingerprint, geo, language, and GPC signal with token-less saves. Nuxt server manifest mode enables it so saves stay bound to the manifest decision, and Nuxt client manifest mode retries a failed manifest fetch on the next init attempt instead of caching the failure until reload.

---
packages:
  '@c15t/astro': minor
  '@c15t/core': minor
  '@c15t/vue': minor
---

### Bundle the manifest by default in Astro and Nuxt

You no longer need `buildManifest: true`. Astro's `manifest()` mode and the
Nuxt module now fetch the policy manifest during `astro build`, `nuxt build`
and dev startup, and bundle it into the server.

The fetch is skipped when the build can't use it: `hosted()` and `offline()`
in Astro; a relative `backendURL` or `manifestURL`; and, in Nuxt,
`manifest: false`, `manifest: 'client'`, a `manifestSnapshot`,
`nuxt generate` or `ssr: false`. On a Nuxt server it bundles, the module now
uses server manifest mode instead of calling the backend's `/init` on every
render.

If the fetch fails or takes longer than 10 seconds, `astro build` and
`nuxt build` stop with an error, and dev logs a warning and fetches the
policy at runtime. `onBuildError` changes that; see the note on failed
build-time manifest fetches. Set `buildManifest: false` to always fetch at
runtime, so policy edits apply without a rebuild. In Nuxt, pair it with
`manifest: 'server'` to keep the server routes.

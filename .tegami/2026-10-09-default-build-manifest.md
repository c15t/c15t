---
packages:
  '@c15t/astro': minor
  '@c15t/core': minor
  '@c15t/vue': minor
---

### Bundle the manifest by default in Astro and Nuxt

With `manifest()`, the default mode, Astro and the Nuxt module fetch the
policy manifest during `astro build`, `nuxt build` and dev startup, and bundle
it into the server.

The fetch is skipped when the build can't use it: `hosted()` and `offline()`;
a relative backend URL; a `snapshot` you pass; `manifest({ resolve: 'browser' })`;
and, in Nuxt, `nuxt generate` or `ssr: false`. On a Nuxt server it bundles,
the module resolves each visitor from the manifest instead of calling the
backend's `/init` on every render.

If the fetch fails or takes longer than 10 seconds, `astro build` and
`nuxt build` stop with an error, and dev logs a warning and fetches the
policy at runtime. `onBuildError` changes that; see the note on failed
build-time manifest fetches. Use `manifest({ source: 'runtime' })` to always
fetch at runtime, so policy edits apply without a rebuild.

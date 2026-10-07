---
packages:
  '@c15t/vue': patch
---

### Show the Nuxt banner with `buildManifest: true`

With `buildManifest: true`, Nuxt showed no banner to any visitor. The module
stored the build-time manifest in runtime config, where Nitro replaces every
`null` with an empty string during the build. Each policy's `copyRevision: null`
became `''`, so every policy failed with `invalid-configuration`.

The snapshot now ships in the server bundle unchanged, and the
`/api/c15t/init` and `/api/c15t/manifest` routes read it from there.

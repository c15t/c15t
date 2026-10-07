---
packages:
  '@c15t/core': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/astro': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  c15t: minor
---

### Generate consent manifests during application builds

Add opt-in build-time manifest snapshots for Next.js, TanStack Start, Astro,
Nuxt and Vite applications. Build plugins accept `backendURL` and append
`/manifest` automatically. Server helpers and consent routes resolve from
the deployment's snapshot without fetching an upstream manifest, including
on a fresh server instance. Request geography, language, privacy signals and
stored consent still resolve per visitor.

Snapshots stay fixed until the next build. A manifest fetch failure stops
the build. Framework quickstarts recommend build-time snapshots for supported
production deployments, with runtime fetching for policy updates that need
to apply without a rebuild. Consent saves, session reports and IAB vendor
lists retain their backend requests.

Next.js runtime manifest requests use the App Router Data Cache with a
300-second revalidation interval. Fix `manifestRevalidateSeconds: false`
to skip that cache instead of caching indefinitely. The in-process manifest
cache still follows upstream cache headers; visitor-specific backend `/init`
requests remain uncached.

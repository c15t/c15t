---
packages:
  '@c15t/core': minor
  '@c15t/schema': patch
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

Vite generation runs during builds and development, skips preview, and can
retry after a failed setup.

Svelte's framework-free `resolveConsent` helper also accepts a snapshot and
resolves it locally, with optional backend session reporting.
Both Svelte server helpers accept a background-work callback to keep session
reports alive on serverless hosts without an event-provided `waitUntil`.

Astro keeps the snapshot out of browser bundles. Nuxt skips manifest fetching
during `nuxt prepare`, including dependency installation and type preparation.

Snapshots stay fixed until the next build. Browser manifest transports can
fall back to the backend's current `/init` resolution when required geography
is missing. A manifest fetch failure or invalid snapshot stops
the build. Framework quickstarts recommend build-time snapshots for supported
production deployments, with runtime fetching for policy updates that need
to apply without a rebuild. Consent saves, session reports and IAB vendor
lists retain their backend requests.

Next.js runtime manifest requests use the App Router Data Cache with a
300-second revalidation interval. Fix `manifestRevalidateSeconds: false`
to skip that cache instead of caching indefinitely. The in-process manifest
cache still follows upstream cache headers; visitor-specific backend `/init`
requests remain uncached.

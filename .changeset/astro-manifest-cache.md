---
'@c15t/astro': patch
---

Manifest mode on Astro now fetches the manifest once per process, and
`middleware: true` is safe on a site that serves its own manifest.

The middleware's prefetch built a fresh `createManifestTransport` per request,
and that transport memoizes the manifest on the instance — so every page
render re-downloaded it. Eight renders against a backend 200 ms away cost nine
manifest fetches and 209 ms TTFB. Both the middleware and the injected
`/api/c15t/init` route now go through `fetchCachedManifest` from
`@c15t/core/server`, the same process-wide cache the SvelteKit and Next.js
layers use: one fetch, then `ETag` revalidation on the backend's schedule. An
inline `manifest` short-circuits the network on both paths.

`createConsentMiddleware` now skips the integration's own init and manifest
routes. With the manifest served by the same process, resolving consent on the
manifest request fetched the manifest, which resolved consent — the first
request never returned, and a site had to register the middleware itself to
break the cycle. Add routes of your own to the new
`middleware: { skip: ['/healthz'] }` option; `middleware: false` still turns
registration off entirely. Paths match on segment boundaries, so `/api` covers
`/api/health` and not `/apidocs`.

`resolveConsentContext` takes an optional `url`, and the middleware passes the
request's. It resolves a relative `backendURL` or `manifestURL` against the
request's own origin and protocol instead of letting the shared resolver
assume `https`.

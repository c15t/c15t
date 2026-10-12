---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### One consent route handler for every server adapter

The `/manifest` and `/init` routes in Next.js, TanStack Start, SvelteKit, Astro
and Nuxt run on one handler, `createConsentRouteHandler` from
`@c15t/core/server`. Entry points and options are unchanged. Behavior that
changes in some adapters:

- The manifest route forwards only a valid `language` query parameter to the
  backend. SvelteKit, Astro and Nuxt used to forward the whole query string.
- The manifest route passes the backend's caching headers through, answers
  `If-None-Match` with `304`, and never adds its own `cache-control`.
- An IAB vendor list that cannot be loaded fails the init request. Astro used to
  answer `gvl: null`, which the browser reads as IAB being off.
- When the manifest cannot be read and `backendURL` is set, every adapter falls
  back to the backend's `/init`. This was Nuxt-only.
- With `proxy` on, SvelteKit sends the `cookieNames` cookies and
  `forwardHeaders` on the manifest request, as TanStack Start does.
- On a catch-all route, paths other than `init`, `manifest` or the route root
  are proxied with `proxy` on, or answer `404`. TanStack Start answers the route
  root with init.

#### Breaking changes

- `@c15t/nextjs/api` no longer exports `fetchCachedManifest`, `getSMaxAge` or
  `ManifestFetchResult`. Use `fetchCachedManifest` from `@c15t/core/server`.
  `manifestGET` no longer adds a default `cache-control` when the backend sends
  none, and no longer sends `x-c15t-next-revalidate`.
- In `@c15t/astro/api`, `resolveManifestInit` rejects when an IAB policy's
  vendor list cannot be loaded instead of returning `gvl: null`. The `FetchGvl`
  callback receives `fetch` typed as `typeof globalThis.fetch`.
- In `@c15t/svelte/kit`, a catch-all route answers `404` for paths other than
  `init`, `manifest` or the route root unless `proxy` is on. Send init requests
  to `<route>/init` or the route root. c15t's own clients already do.

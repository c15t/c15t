---
"@c15t/vue": patch
---

Fix manifest-mode edge caching and same-origin self-hosting in the Nuxt module.

- The Nuxt manifest route forwards the backend's `Cache-Control` and `ETag`
  verbatim instead of Nitro's `max-age=1` and `Vary: Accept-Language`, so the
  geo-independent manifest is genuinely CDN-cacheable. `Vary` is no longer
  forwarded at all — the response body depends only on the request URL.
- Backends that serve `/manifest` without a shared-cache TTL are now deduped
  in-process for a short floor, replacing the dedupe the cached-event-handler
  wrapper used to provide.
- A relative `backendURL` (e.g. `/api/self-host` when `@c15t/backend` is
  mounted in the same Nitro app) is routed through Nitro's in-process
  `localFetch`, since `globalThis.fetch` rejects relative URLs in Node.
  Absolute URLs are unaffected.
- The branding tag resolves its `?ref=` link after mount, fixing an SSR/client
  hydration mismatch.
- `fetchCachedManifest` now types its `fetch` option as the call signature it
  actually uses (exported as `ManifestFetch`) rather than
  `typeof globalThis.fetch`, which carries static members such as
  `fetch.preconnect` that custom implementations do not provide.

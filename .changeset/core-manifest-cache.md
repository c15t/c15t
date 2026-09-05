---
'@c15t/core': minor
'c15t': minor
---

Add `@c15t/core/transports/manifest-cache` (also `c15t/transports/manifest-cache` on the umbrella package): the in-process consent-manifest cache the framework server adapters share. `fetchCachedManifest` honours the backend's `s-maxage`, revalidates with `ETag`/`If-None-Match`, never caches `no-store`/`no-cache`/`private` responses, and dedupes token-less backends for a short floor; `createManifestCache({ maxEntries })`/`clearManifestCache` let hosts own the cache instance, bounded to 128 entries by default with expired entries evicted first and least recently used next; `resolveManifestInit` resolves `GET /init` locally from a manifest using request headers or explicit resolver inputs; `resolveManifestSourceURL`, `createManifestRequestURL`, and `MANIFEST_PASSTHROUGH_HEADERS` cover the URL and header plumbing a proxying route needs.

`hosted()` accepts `initURL` and `assertDecisionInputs`, so a provider can point `GET /init` at a same-origin route that resolves from a manifest while saves keep going to the backend.

`fetchCachedManifest` also coalesces concurrent misses for the same URL into one upstream request, treats an explicit `s-maxage=0` as revalidate-on-every-use instead of applying the dedupe floor, and accepts `headers` for the upstream request so a private manifest can carry a cookie or an authentication header.

Restrictive directives win: `no-store`, `no-cache`, and `private` are never cached even alongside a positive `s-maxage`. Entries and in-flight requests are partitioned by a digest of the forwarded headers, and credentials are refused over plain `http:` except to loopback hosts. `getMatchingPrefetchedInitialData` and `primePrefetchedInitialData` are exported so framework adapters can hand a head-prefetched init response to the provider.


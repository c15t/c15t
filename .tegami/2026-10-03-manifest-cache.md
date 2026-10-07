---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### One manifest cache for every server adapter

Next.js, Nuxt, SvelteKit, Astro and TanStack Start read the backend manifest
through `fetchCachedManifest` from `@c15t/core/server` and share one in-process
cache. Query parameter order and the URL fragment no longer split cache entries,
and a signed `manifestURL` still verifies. Pass a framework fetch hint such as
Next.js `{ next: { revalidate } }` through the `init` option.

Breaking changes:

- `@c15t/core/libs/manifest-cache` and `c15t/libs/manifest-cache` are removed.
  Import `fetchCachedManifest` and `clearManifestCache` from `@c15t/core/server`
  (`c15t/server`) and pass `sourceURL` instead of `url`. The `CachedManifest`
  type is now `CachedManifestResponse`.
- `fetchCachedManifest` from `@c15t/core/server` and `@c15t/astro/api` takes
  `sourceURL` instead of `config`. Build it with `resolveManifestSourceURL({
  backendURL, manifestURL })` from `@c15t/core/server`. The
  `ManifestSourceConfig` type is removed; use `ManifestSourceOptions`.
- `@c15t/vue/runtime/server/manifest-mode` and
  `c15t/vue/runtime/server/manifest-mode` are removed. Import the cache helpers
  from `@c15t/core/server`, and `resolveManifestInit` and
  `getResolverInputsFromHeaders` from `@c15t/core/transports/manifest-cache`.
  `clearManifestRouteCache()` is `clearManifestCache()`.

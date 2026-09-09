---
"@c15t/core": patch
"@c15t/astro": patch
"@c15t/svelte": patch
"@c15t/node-sdk": patch
"@c15t/scripts": patch
"@c15t/cli": patch
---

Share manifest cache behavior across server adapters. Reject redirects when forwarding identity headers and apply a ten-second request timeout when no caller abort signal is supplied. Forward the adjusted Age through Next.js, Astro, and SvelteKit manifest routes so downstream caches do not restart freshness. Expose fetchedAt and upstreamAge in the cache response types used by getManifestAge. Subtract upstream Age from freshness, revalidate responses with s-maxage=0, and invalidate pending cache fills when clearing the cache.

Use native Promise executors for callback APIs and retry delays, removing the dependency on Promise.withResolvers in these paths.

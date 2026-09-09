---
"@c15t/core": patch
"@c15t/node-sdk": patch
"@c15t/scripts": patch
"@c15t/cli": patch
---

Share manifest cache behavior across server adapters. Subtract upstream Age from freshness, revalidate responses with s-maxage=0, and invalidate pending cache fills when clearing the cache.

Use native Promise executors for callback APIs and retry delays, removing the dependency on Promise.withResolvers in these paths.

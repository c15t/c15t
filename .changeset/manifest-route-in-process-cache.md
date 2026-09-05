---
"@c15t/core": minor
"@c15t/nextjs": patch
---

Cache the backend manifest in process behind the Next.js manifest route. `@c15t/nextjs/api` relied on the Next.js Data Cache, which only exists in the App Router, so the Pages Router refetched the backend `/manifest` on every request. The new `@c15t/core/libs/manifest-cache` honours the backend's `s-maxage`, revalidates with `If-None-Match` once an entry expires, coalesces concurrent misses into one backend request, and skips caching for `no-store`, `no-cache`, or `private` responses; the route handler uses it on every runtime and still passes `next.revalidate` through for the App Router.

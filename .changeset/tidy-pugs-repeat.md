---
'@c15t/backend': patch
---

Update the `hono` dependency from 4.12.27 to 4.12.34, picking up fixes for a ReDoS in the CORS middleware via `Access-Control-Request-Headers`, an SSR `memo()` cache that could retain output across requests, and the Proxy Helper retaining response headers listed in the `Connection` header.

`hono` is now declared as `^4.12.34` rather than pinned to a single version. The published types re-export it (`C15TApp` is a `Hono` instance), so an exact pin could install a second copy of Hono alongside the one in your app — breaking `instanceof` checks across the two copies — and it prevented you from picking up Hono security releases without waiting for a new `@c15t/backend`.

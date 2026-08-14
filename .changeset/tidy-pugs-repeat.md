---
'@c15t/backend': patch
---

Update `hono` from 4.12.27 to 4.12.34, picking up fixes for a ReDoS in the CORS middleware via `Access-Control-Request-Headers`, an SSR `memo()` cache that could retain output across requests, and the Proxy Helper retaining response headers listed in the `Connection` header.

`hono` is now declared as `^4.12.34` rather than an exact pin, so you can pick up Hono security releases without waiting for a new `@c15t/backend`.

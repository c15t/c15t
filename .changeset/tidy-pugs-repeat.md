---
'@c15t/backend': patch
---

Update the pinned `hono` dependency from 4.12.27 to 4.12.34, picking up fixes for a ReDoS in the CORS middleware via `Access-Control-Request-Headers`, an SSR `memo()` cache that could retain output across requests, and the Proxy Helper retaining response headers listed in the `Connection` header.

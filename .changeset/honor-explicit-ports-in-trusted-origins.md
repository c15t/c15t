---
"@c15t/backend": patch
---

# Honor explicit ports in trusted origins

Preserve explicit ports configured in `trustedOrigins` during CORS origin checks instead of stripping them. Host-only entries (e.g. `example.com`) remain port-agnostic, but entries with an explicit port (e.g. `localhost:3000`) now only trust that exact port.

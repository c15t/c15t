---
"@c15t/backend": patch
"@c15t/schema": patch
---

feat: Add edge-compatible `/init` handler for running consent policy resolution at the edge

- `c15tEdgeInit()` — drop-in `/init` replacement for Vercel Middleware, Cloudflare Workers, and Deno Deploy
- `resolveConsent()` — lightweight synchronous resolver for custom consent cookie flows
- `resolvePolicySync()` — synchronous policy matching without fingerprint computation
- Refactored `/init` route to use shared `resolveInitPayload` (no behavior change)

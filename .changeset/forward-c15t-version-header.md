---
"@c15t/backend": patch
"@c15t/node-sdk": patch
"@c15t/react": patch
"c15t": patch
---

Forward `x-c15t-version` on backend-bound requests from browser, SSR, prefetch, and Node SDK clients, and allow the header through backend CORS preflight handling.

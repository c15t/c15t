---
'@c15t/backend': patch
---

Declare `hono` as a caret range (`^4.12.34`) instead of an exact pin, and drop the root override that held it back, so consumers pick up the CORS-middleware ReDoS fix and later patch releases without a c15t release. Patch-level security updates applied across the workspace: `vitest` 4.1.10, `@hono/node-server` 1.19.17 and `fast-uri` 3.1.5.

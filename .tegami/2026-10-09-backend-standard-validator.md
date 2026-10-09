---
packages:
  '@c15t/backend': patch
---

### Start under pnpm and Yarn

`@c15t/backend` now depends on `@hono/standard-validator`. Its OpenAPI layer
imports that package on startup but only lists it as an optional peer, so pnpm
and Yarn skipped it and the backend failed with `ERR_MODULE_NOT_FOUND` before
serving a request.

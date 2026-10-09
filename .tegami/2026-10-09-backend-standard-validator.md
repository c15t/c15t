---
packages:
  '@c15t/backend': patch
---

### Install the OpenAPI packages the backend loads at runtime

`@c15t/backend` now depends on `@hono/standard-validator`,
`@standard-community/standard-json`, `@standard-community/standard-openapi`,
`quansync` and `@valibot/to-json-schema`. Its OpenAPI layer loads them but
lists them only as peers. pnpm skipped the optional ones and Yarn skipped all
of them, so the backend failed with `ERR_MODULE_NOT_FOUND` before serving a
request. Without `@valibot/to-json-schema`, which no package manager installs
on its own, `/spec.json` returned a 500.

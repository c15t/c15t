---
packages:
  "@c15t/backend": minor
  "@c15t/node-sdk": patch
  "@c15t/schema": patch
---

### Stricter input on subject writes, with opt-in domain and identity limits

`POST /subjects` and `PATCH /subjects/:id` accept JSON bodies only. A request
with another `Content-Type`, or none, gets `415 UNSUPPORTED_MEDIA_TYPE` and
writes nothing. 2.x backends refused these bodies in their request validators,
and the c15t clients and `@c15t/node-sdk` send JSON.

A save's `domain` must be 1 to 253 characters with no control characters.
Other values get `400 INPUT_VALIDATION_FAILED`.

Two new backend options, both off by default:

- `allowedDomains` lists the domains a save may name, written like
  `trustedOrigins` entries. A save naming another domain gets
  `400 DOMAIN_NOT_ALLOWED` and creates no row. An empty list throws when the
  instance is built.
- `identityToken.requireVerifiedLinks` stores identity links only when an API
  key or identity token proves them. `PATCH /subjects/:id` without either gets
  `401 IDENTITY_TOKEN_REQUIRED` and creates nothing. A save still records its
  consent, without the external ID.

`@c15t/node-sdk` types the new codes: `subjects.create` can return
`DOMAIN_NOT_ALLOWED`, and `subjects.identify` can return
`IDENTITY_TOKEN_REQUIRED`.

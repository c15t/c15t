---
packages:
  '@c15t/backend': minor
  '@c15t/node-sdk': minor
  '@c15t/schema': minor
  '@c15t/core': minor
---

### Verified identity links

Identity links between a subject and your user ID now record whether they were verified. `GET /subjects?externalId=` and `GET /consents/check` count verified links only.

A link is verified when the request carries an API key, or an `identityToken` signed with the new `identityToken.signingKey` instance option. Mint tokens on your server with `createIdentityToken` from `@c15t/node-sdk`, and pass them to the browser's `identify({ externalId, identityToken })`.

- `GET /consents/check` requires an API key. In `@c15t/node-sdk`, `consents.check` moves to the client created with `apiKey`.
- Links made before this release, including by a v2 backend, are unverified until your server relinks them with an API key or the browser sends a token.
- `PATCH /subjects/:id` returns `401 IDENTITY_TOKEN_INVALID` for a token that fails to verify, and `409 IDENTITY_CONFLICT` when an unverified request tries to replace a verified link.
- `POST /subjects` never refuses a consent over its token. A failed token leaves the link unverified.
- Migration 8 adds `subject.verifiedExternalId`. Run the migrator before deploying.

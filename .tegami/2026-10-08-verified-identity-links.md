---
packages:
  '@c15t/backend': minor
  '@c15t/node-sdk': minor
  '@c15t/schema': minor
  '@c15t/core': minor
---

### Verified identity links

`GET /subjects?externalId=` and `GET /consents/check` now count only verified links between a subject and your user ID. A link is verified by an API key, or by an `identityToken` from `createIdentityToken` in `@c15t/node-sdk`, passed to `identify({ externalId, identityToken })` and checked against the new `identityToken.signingKey` option.

- `GET /consents/check` requires an API key, so `consents.check` moves to the node-sdk client created with `apiKey`.
- Existing links, including those made by v2, stay unverified until relinked.
- Migration 8 adds `subject.verifiedExternalId`.

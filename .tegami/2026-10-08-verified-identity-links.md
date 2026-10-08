---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Verified identity links

`GET /subjects?externalId=` and `GET /consents/check` now count only verified links between a subject and your user ID. A link is verified by an API key, or by an `identityToken` from `createIdentityToken` in `@c15t/node-sdk`, passed to `identify({ externalId, identityToken })` and checked against the new `identityToken.signingKey` option.

- `GET /consents/check` requires an API key, so `consents.check` moves to the node-sdk client created with `apiKey`.
- Existing links, including those made by v2, stay unverified until relinked.
- Migration 8 adds `subject.verifiedExternalId`.

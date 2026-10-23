---
packages:
  '@c15t/backend': patch
---

### Validate identity links before writing, and skip repeated links

`PATCH /subjects/:id` now checks that `externalId` and `identityProvider` are
strings before it writes anything. Other values get a 400 with
`INPUT_VALIDATION_FAILED`. Before, a number or an object could create the
subject and then fail the link, with a misleading 409 or a 500, or store the
value as text such as `"[object Object]"`.

Creating a subject and linking it now happen in one transaction. A link the
database rejects leaves no subject behind.

A link that matches the stored identity, provider and verification state writes
nothing, so client retries no longer add an `identify_user` audit entry each
time. A link that verifies the identity or changes the provider is still stored
and audited.

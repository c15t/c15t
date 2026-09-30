---
packages:
  '@c15t/backend': minor
  '@c15t/core': patch
  'c15t': patch
---

### Refuse unsafe tenant configuration, and recover visitors whose subject ID another tenant holds

`c15tInstance` and `createApp` now check the tenant when the instance is built. They throw when `tenantId` is empty, padded with whitespace or not a string (a `null` from a JavaScript config used to scope every query to `tenantId = NULL`, which matches nothing), and when `manifest.tenantId` differs from the instance's `tenantId`, which minted policy snapshot tokens for one tenant while writing records under another. The new `requireTenantId: true` option makes a missing `tenantId` throw too. Set it on every instance that shares a database with other tenants. Without it, an instance whose tenant lookup returned `undefined` starts in the single-tenant scope and writes consents with a null tenant, which the tenant that owns them never reads.

Subject IDs are chosen by the browser and are unique across the whole database. A save naming a subject ID that another tenant holds was answered `400 CONFLICT`, on every save, with no way for the visitor to recover. It is now `409 SUBJECT_CONFLICT`. `@c15t/core` responds by giving the visitor a new subject ID, moving any queued saves to it, and sending the choice once more. A consent recorded again with different receipts, purposes or vendor grants is now `409 CONFLICT` instead of `400`. The hosted and manifest transports treat both as permanent refusals, so the kernel no longer replays them from its queue.

#### Migration

- Code that matched `400` with `cause.code: 'CONFLICT'` from `POST /subjects` should expect `409`, and `SUBJECT_CONFLICT` for a subject ID held by another tenant. `PUT /legal-documents` conflicts are still `400 CONFLICT`.
- A configuration that set `manifest.tenantId` without `tenantId`, or with a different one, now throws at startup. That instance has been writing rows with a null tenant. To keep reading them, remove `manifest.tenantId`. Setting `tenantId` to the manifest's value instead scopes the instance to that tenant, and the null-tenant rows stop appearing in its reads.

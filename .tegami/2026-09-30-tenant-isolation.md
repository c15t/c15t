---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Single tenant setting and subject ID conflict recovery

A self-hosted backend sets its tenant only through the instance's
`tenantId`. `manifest.tenantId` is removed from the backend configuration.
`c15tInstance` and `createApp` throw when `tenantId` is empty, padded with
whitespace or not a string, and when the config still sets `manifest.tenantId`.
The new `requireTenantId: true` option also throws when `tenantId` is missing.
Set it on every instance that shares a database with other tenants.

A save naming a subject ID that another tenant holds returns
`409 SUBJECT_CONFLICT` instead of `400 CONFLICT`. `@c15t/core` gives the
visitor a new subject ID and sends the choice again, so the visitor is no
longer stuck. A consent recorded again with different receipts, purposes or
vendor grants returns `409 CONFLICT` instead of `400`.

#### Migration

- Move `tenantId` from the backend's `manifest` block to the instance. If the
  instance set only `manifest.tenantId`, it has been writing rows with a null
  tenant, and those rows stop appearing in its reads once `tenantId` is set.
- Code matching `400` with `cause.code: 'CONFLICT'` from `POST /subjects`
  should expect `409`, and `SUBJECT_CONFLICT` for a subject ID held by another
  tenant. `PUT /legal-documents` conflicts are still `400 CONFLICT`.
- Manifests built from a config that set `tenantId` get a new `revision`, so
  cached manifests refresh once.

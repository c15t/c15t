---
packages:
  '@c15t/backend': patch
---

### Record the tenant on identity-link audit entries

On an instance configured with a `tenantId`, `PATCH /subjects/:id` wrote its
`identify_user` audit entry with a NULL tenant, while the subject and the
`consent_given` entry carried the configured one. Identity-link entries now
carry the tenant too. Entries written before this fix keep a NULL tenant; their
subject's `tenantId` identifies the tenant they belong to.

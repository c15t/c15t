---
"@c15t/backend": patch
"@c15t/core": patch
---

Fix v3 manifest-mode saves and edge caching.

**`@c15t/backend`** — manifest recompute-on-write wrote the runtime policy pack
id (e.g. `europe_opt_in`) into `consent.policyId`, which is a foreign key into
`consentPolicy`. Every manifest-mode `POST /subjects` failed on an
FK-enforcing database such as Postgres; SQLite hid it because `PRAGMA
foreign_keys` defaults to off. The consent row is now anchored to a real
`consentPolicy` record via `findOrCreatePolicy`, and pack identity plus
fingerprint stay on `runtimePolicyDecision` where they belong.

**`c15t`** — the manifest transport no longer asserts partial decision inputs
when the manifest resolved no policy pack. Sending `country`/`language`
without `policyId`/`fingerprint` was rejected by the backend as incomplete
(`422 STALE_POLICY`).

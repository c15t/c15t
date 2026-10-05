---
packages:
  '@c15t/backend': patch
---

### Record one decision per visit whichever way the save arrives

A save with a policy snapshot token keyed its runtime decision on the raw `Accept-Language` header. A save without one keyed it on the language the client was served. One visit could therefore produce two decision rows, for example with `Accept-Language: en;q=0.1,de;q=0.9`. Both paths now key on the served language: tokens carry it in a new `servedLanguage` claim, tokens from earlier alphas resolve it from their header, and a save without a token records the language the client says it was shown.

The dedupe key is now built from the policy fingerprint, match reason, country, region and language, and is hashed for single-tenant deployments as well as multi-tenant ones, so it always fits MySQL's indexed `varchar(255)`. v3 keys never matched 2.x rows, because v3 policy fingerprints differ, so a database records each decision once more after the upgrade and then deduplicates as before.

---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Save consent when the decision table's unique index differs

On Postgres and SQLite, consent saves that recorded a policy decision failed
with a 500 when `runtimePolicyDecision` had no unique index on `dedupeKey`
alone, for example one on `(tenantId, dedupeKey)`. Those inserts fall back to
any unique index.

`createMigrator().plan()` and `apply()` report schema problems they don't repair
in a new `drift` field, and `c15t self-host migrate --plan` prints them as
warnings. The first check flags this missing index and gives the
`create unique index` statement to add it. A `(tenantId, dedupeKey)` index does
not deduplicate single-tenant rows, where `tenantId` is null.

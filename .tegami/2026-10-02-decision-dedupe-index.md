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

On Postgres and SQLite, runtime policy decisions were inserted with `on conflict ("dedupeKey")`. A database whose `runtimePolicyDecision` table had no unique index on `dedupeKey` alone, such as one indexed on `(tenantId, dedupeKey)`, rejected that statement, so every consent save that recorded a decision failed with a 500. When the database has no index for that conflict target, decision inserts now retry with a conflict on any unique index treated as the duplicate. Databases with the expected index keep the targeted statement.

`createMigrator().plan()` and `apply()` report schema problems they do not repair in a new `drift` field, and `c15t self-host migrate --plan` prints them as warnings. The first check flags a decision table without a unique index on `dedupeKey` alone and gives the `create unique index` statement to add it. A composite index on `(tenantId, dedupeKey)` does not deduplicate single-tenant rows, because `tenantId` is null there.

---
packages:
  '@c15t/backend': minor
---

### Run the backend on Effect 4.0.0

`@c15t/backend` now depends on the stable `effect@4.0.0` instead of `4.0.0-beta.102`. Its database driver peers moved to match, so install `@effect/sql-pg`, `@effect/sql-mysql2` or `@effect/sql-sqlite-node` at `4.0.0`. A beta driver no longer satisfies the peer range. If you pass your own `SqlClient` layer, import from `effect/sql` instead of `effect/unstable/sql`.

`@effect/sql-pg` 4.0.0 replaces the `pg` package with its own PostgreSQL client and caches named prepared statements by default. Direct connections need no change. Behind a pooler in transaction mode, such as PgBouncer or a provider's pooled URL, queries can fail because the next connection never prepared the statement. Pass `PgClient.layer({ url, prepare: false })` as `database`; the [database setup guide](https://c15t.com/docs/self-host/guides/database-setup) shows the full config.

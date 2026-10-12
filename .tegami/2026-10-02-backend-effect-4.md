---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
---

### Run the backend on Effect 4.0.0

`@c15t/backend` depends on stable `effect@4.0.0`. Install `@effect/sql-pg`,
`@effect/sql-mysql2` or `@effect/sql-sqlite-node` at `4.0.0`, since beta
drivers no longer satisfy the peer range. If you pass your own `SqlClient`
layer, import from `effect/sql` instead of `effect/unstable/sql`.

`@effect/sql-pg` 4.0.0 caches named prepared statements by default. Behind a
pooler in transaction mode, such as PgBouncer, queries can fail. Pass
`PgClient.layer({ url, prepare: false })` as `database`. See the
[database setup guide](https://c15t.com/docs/self-host/guides/database-setup).

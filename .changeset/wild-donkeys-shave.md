---
'@c15t/backend': major
'@c15t/cli': major
---

Rewrite the backend on Effect.

`c15tInstance(options).handler(request)` is unchanged, so host integrations
do not need rewriting. Storage configuration does change, because there is no
ORM adapter to hand over any more:

```diff
-c15tInstance({ adapter: kyselyAdapter({ db, provider: 'postgresql' }) })
+c15tInstance({ database: { dialect: 'postgres', url: process.env.DATABASE_URL } })
```

`database` also accepts a `SqlClient` layer for anyone sharing a pool or
embedding c15t in an Effect application.

**Breaking**

- `@c15t/backend/db/adapters/*` is removed — Drizzle, Prisma, TypeORM, Kysely
  and Mongo. c15t connects to Postgres, MySQL or SQLite directly. Your database
  is unchanged; only the connection configuration moves.
- **MongoDB is no longer supported, and there is no migration path.** A 2.x
  deployment on MongoDB should stay on 2.x.
- `@c15t/backend/edge` is removed. `resolveInitFromManifest` from
  `@c15t/schema` is the resolver it was built on and can be called directly.
- `@c15t/backend/db/migrator` is replaced by `createMigrator(database)`, which
  offers `plan`, `apply` and `dispose`.

**Fixed**

- MySQL now works. fumadb could not migrate MySQL at all, on any adapter.
- Foreign key columns and every column the backend filters on are indexed.
  No shipped version indexed any of them, including `tenantId`, which every
  query in a multi-tenant deployment filters on.
- `GET /subjects?externalId=` is two queries regardless of how many subjects
  and policy types are involved, rather than one plus a chunk per hundred
  subjects plus one per policy type.

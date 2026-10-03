---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
---

### Share a database with a v2 backend

A v2 and a v3 backend can now write to the same database without losing or refusing each other's consents.

- **v2 purpose lists are read.** The v2 backend can store a consent's `purposeIds` as `{"json": [...]}` rather than a bare array. The v3 backend read those rows as granting nothing: `GET /subjects/:id` returned no choice for a visitor whose newest save went through v2, and that row also cleared the visitor's earlier v3 grants. The envelope is now unwrapped, so the row reads as the categories the visitor granted.
- **Retries of v2 saves succeed.** A save the v2 backend stored, retried against the v3 backend, was refused with `409 CONFLICT` because the v2 row has no category receipts. The retry is now accepted as the same act. A retry with different purposes is still refused with `409`.
- **Timestamps are stored in UTC.** The v3 backend wrote times in the database session's time zone and read them back as UTC. On a PostgreSQL server outside UTC, every stored time was shifted by the zone's offset. Connections built from a `database` config now pin the session to UTC on PostgreSQL and set mysql2's `timezone` to `Z` on MySQL, overriding any time zone in the URL. SQLite is unaffected.

#### Migration

- If you pass your own client layer, set the time zone on it: `startupParameters: { timezone: 'UTC' }` for `PgClient.layer`, or `timezone=Z` in the URL for `MysqlClient.layer`.
- Run a v2 backend that shares the database with `TZ=UTC`.
- Rows the v3 backend already wrote through a non-UTC session keep their shifted times.

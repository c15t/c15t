---
packages:
  "@c15t/backend": patch
---

### Share a database with a v2 backend

A v2 and a v3 backend can now write to the same database without losing or refusing each other's consents.

- **v2 purpose lists are read.** The v2 backend can store a consent's `purposeIds` as `{"json": [...]}` rather than a bare array. The v3 backend read those rows as granting nothing: `GET /subjects/:id` returned no choice for a visitor whose newest save went through v2, and that row also cleared the visitor's earlier v3 grants. The envelope is now unwrapped, so the row reads as the categories the visitor granted.
- **Retries of v2 saves succeed.** A save the v2 backend stored, retried against the v3 backend, was refused with `409 CONFLICT` because the v2 row has no category receipts. A retry that carries no receipts of its own, as a v2 client's does, is now accepted as the same act when the row's purposes match it and the row holds them in the `{"json": [...]}` form v2 has written since September 2025. Any other retry against a row without receipts is still refused with `409`, including one against an older v2 row, one that adds a refusal to a v3 row with only `necessary`, and one with different purposes or with receipts the row does not hold.
- **Timestamps are stored in UTC.** The v3 backend wrote times in the database session's time zone and read them back as UTC. On a PostgreSQL server outside UTC, every stored time was shifted by the zone's offset. Connections built from a `database` config now pin the session to UTC on PostgreSQL and set mysql2's `timezone` to `Z` on MySQL, overriding any time zone in the URL. SQLite is unaffected.

#### Migration

- If you pass your own client layer, set the time zone on it: `startupParameters: { timezone: 'UTC' }` for `PgClient.layer`, or `timezone=Z` in the URL for `MysqlClient.layer`.
- Run a v2 backend that shares the database with `TZ=UTC`.
- If a v2 or v3 backend stored timestamps in a zone other than UTC, existing rows now read shifted by that zone's offset, including on MySQL, where they read correctly before. Running the backend's host outside UTC is not enough on its own: what matters is the zone the connection stored in. [Backend database setup](/docs/self-host/guides/database-setup#convert-timestamps-written-outside-utc) lists when that happened. If it did, stop every backend, back up, and convert the rows with the script there before deploying.

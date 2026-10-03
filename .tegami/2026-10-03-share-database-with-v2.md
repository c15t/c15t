---
packages:
  "@c15t/backend": patch
---

### Share a database with a v2 backend

The backend now reads consents a v2 backend stored as `{"json": [...]}`, and accepts a v2 client's retry of a save v2 recorded instead of returning `409`.

Timestamps are now stored in UTC on PostgreSQL and MySQL connections built from a `database` config. If you pass your own client layer, set UTC on it. If a backend stored timestamps in another zone, convert them first; see [backend database setup](/docs/self-host/guides/database-setup#store-timestamps-in-utc).

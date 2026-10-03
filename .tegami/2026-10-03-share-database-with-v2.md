---
packages:
  "@c15t/backend": patch
---

### Share a database with a v2 backend

The backend now reads consents that a v2 backend stored as `{"json": [...]}`. When a v2 client retries a save that a v2 backend already recorded, the backend accepts the retry instead of returning `409`.

Timestamps are now stored in UTC on PostgreSQL and MySQL connections built from a `database` config. If you pass your own client layer, set UTC on it. If a backend stored timestamps in another zone, convert them first; see [backend database setup](/docs/self-host/guides/database-setup#store-timestamps-in-utc).

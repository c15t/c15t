---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
---

### Share a database with a v2 backend

The backend reads consents a v2 backend stored as `{"json": [...]}`, and
accepts a v2 client's retry of an already recorded save instead of returning
`409`.

PostgreSQL and MySQL connections built from a `database` config store
timestamps in UTC. If you pass your own client layer, set UTC on it. If a
backend stored timestamps in another zone, convert them first. See
[backend database setup](/docs/self-host/guides/database-setup#store-timestamps-in-utc).

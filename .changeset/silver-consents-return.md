---
"c15t": patch
"@c15t/backend": patch
"@c15t/schema": patch
---

Prevent duplicate consent records from concurrent identical submissions without requiring a database migration. Concurrent in-flight client saves with the same intent are coalesced, and backend submissions derive the consent primary key from tenant, subject, domain, policy, and `givenAt`, so identical requests collide on the key every deployed database already enforces. Scope legacy duplicate lookups to the current tenant, and reject timestamps outside JavaScript's representable `Date` range before deriving the ID.

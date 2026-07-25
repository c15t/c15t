---
"c15t": patch
"@c15t/backend": patch
"@c15t/schema": patch
---

Prevent duplicate consent records when identical subject submissions race. Concurrent client saves with the same intent are coalesced, and the consent record's primary key is derived from the submission itself (tenant, subject, domain, policy, and `givenAt`), so identical requests collide on the key the database already enforces. Reject timestamps outside JavaScript's representable `Date` range before deriving the ID. No database migration is required.

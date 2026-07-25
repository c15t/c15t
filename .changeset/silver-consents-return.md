---
"@c15t/backend": patch
---

Prevent duplicate consent records when identical subject submissions race. The consent record's primary key is now derived from the submission itself (tenant, subject, domain, policy, and `givenAt`), so concurrent identical requests collide on the key the database already enforces and the losing request returns the winner's record instead of inserting a duplicate. No schema change or migration is required.

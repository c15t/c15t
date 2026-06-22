---
"@c15t/backend": patch
"@c15t/schema": patch
---

Match legal-document policy types (`privacy_policy`, `dpa`, `terms_and_conditions`) by prefix so suffixed variants like `terms_and_conditions_b2b` are accepted, letting multiple policies of one family be active at once. Unknown types are still rejected.

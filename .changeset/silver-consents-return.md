---
"@c15t/backend": patch
"@c15t/schema": patch
---

Prevent duplicate consent records when identical subject submissions race by storing a consent dedupe key and returning the existing record on insert conflict.

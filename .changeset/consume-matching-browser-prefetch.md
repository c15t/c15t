---
"@c15t/core": patch
---

Consume a matching early browser prefetch once during hosted initialization to avoid a duplicate init request. Preserve the producer's policy contract declaration, retry failed prefetches through the normal transport, and send the policy contract header with early requests. Detect browser GPC only when its value is boolean true.

Require the same country, region, and language inputs when reusing a browser prefetch. Omitting an override does not match a response fetched with that override.

---
'@c15t/core': patch
'@c15t/dev-tools': patch
'@c15t/iab': patch
---

Keep script load diagnostics working without legacy debug listeners. Restrict
custom-vendor bulk choices to declared legal bases and record partial-policy
consent actions as custom choices. Handle initialization retries, queued saves,
and non-JSON transport errors in DevTools, without rendering closed tabs.

Make category controls read-only under IAB policies, where vendors and purposes
are authoritative. Preserve synchronous script load callbacks and include the
retained script element in consent-revocation callbacks.

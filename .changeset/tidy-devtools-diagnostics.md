---
'@c15t/core': patch
'@c15t/dev-tools': patch
'@c15t/iab': patch
---

Keep script load diagnostics working without legacy debug listeners. Restrict
custom-vendor bulk choices to declared legal bases and record partial-policy
consent actions as custom choices. Handle initialization retries, queued saves,
and non-JSON transport errors in DevTools, without rendering closed tabs.

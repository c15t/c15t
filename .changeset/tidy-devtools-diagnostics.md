---
'@c15t/core': patch
'@c15t/dev-tools': patch
'@c15t/iab': patch
---

Keep script load diagnostics working without legacy debug listeners. Restrict
registered and custom vendor controls to declared legal bases and record partial-policy
consent actions as custom choices. Handle initialization retries, queued saves,
and non-JSON transport errors in DevTools, without rendering closed tabs.

Make category controls read-only under IAB policies, where vendors and purposes
are authoritative. Preserve synchronous script load callbacks and include the
retained script element in consent-revocation callbacks.

Keep the closed launcher focused during background events without rebuilding
hidden panel elements. Allow Escape to close floating panels in custom containers.

Exclude custom vendor IDs from TCF consent, legitimate-interest, and disclosure
vectors while retaining their choices in kernel state.

Allow IAB playgrounds to disable TC-string cookie and localStorage writes with
`persistence: false`, without disabling the configured save transport.

---
"c15t": minor
"@c15t/schema": minor
"@c15t/iab": patch
---

Correlate hosted consent initialization and accepted saves through existing requests. Add an ephemeral ID to browser init and prefetch requests, accept only a matching backend acknowledgement, and preserve the ID on ordinary, queued, deferred, and IAB saves. No separate tracking requests, heartbeats, or exit beacons are sent. Shared SSR data stays untracked unless a request-scoped server helper provides matching metadata; measurement describes observed initializations, not unique visitors or confirmed exits.

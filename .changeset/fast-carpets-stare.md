---
"c15t": minor
"@c15t/schema": minor
"@c15t/iab": minor
---

Add optional hosted consent visit measurement, enabled only by an explicit backend init response. An ephemeral browser visit ID links resolved consent state, visible-page activity, and page exit to server-confirmed consent saves, including deferred retries. SSR hydration and cached runtime remounts share the same lifecycle without requiring another init request. Tracking failures never block consent, and runtimes can explicitly dispose of measurement listeners and timers.

IAB visits wait for stored TC-string restoration before classifying their initial state, and IAB saves preserve the same visit link alongside existing TCF metadata.

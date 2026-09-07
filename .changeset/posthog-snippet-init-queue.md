---
'@c15t/scripts': patch
---

Seed the PostHog bootstrap stub with the pending-init tuple that current `array.js` releases require before they install over an existing `window.posthog`. Since posthog-js 1.410.2 the loader returned successfully but left the c15t stub in place, so every event was dropped.

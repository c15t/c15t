---
'@c15t/scripts': patch
---

Preserve `posthog.capture(...)` calls made after c15t bootstraps PostHog but before its SDK finishes loading.

The helper now uses PostHog's root snippet queue and pending init tuple, with the current consent decision queued before captured events replay. It also leaves an already-installed PostHog SDK unchanged during later consent revoke and re-grant cycles.

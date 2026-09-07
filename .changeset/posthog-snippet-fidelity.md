---
'@c15t/scripts': patch
---

Keep `posthog.capture(...)` calls made before the SDK arrives in PostHog's root queue and apply the consent decision before those events replay. The loader now initializes from the seeded `_i` tuple instead of a second post-load `init`, and bootstrap no longer overwrites an installed SDK when an `after-consent` integration loads again after consent is revoked and restored.

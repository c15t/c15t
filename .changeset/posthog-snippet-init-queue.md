---
'@c15t/scripts': patch
---

Fix the PostHog integration loading no analytics runtime at all. Since posthog-js 1.410.2, `array.js` refuses to install itself over an existing `window.posthog` that has no snippet-shaped pending-init queue, so c15t's bootstrap stub was left in place and every call — including `init` — silently became a no-op. The stub now seeds `_i` like the official snippet does.

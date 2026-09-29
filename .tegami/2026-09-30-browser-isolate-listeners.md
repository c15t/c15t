---
packages:
  '@c15t/browser': patch
---

### Keep dispatching client events when a listener throws

A listener registered with `on()` that throws no longer stops the listeners after it or the matching `c15t:*` document event. The error is logged with `console.error`. This also covers the `ready` and `ui` listeners that `on()` calls at once after the policy has resolved, so `on()` still returns its unsubscribe function.

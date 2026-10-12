---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Keep dispatching client events when a listener throws

A listener registered with `on()` that throws no longer stops later listeners
or the matching `c15t:*` document event. The error is logged with
`console.error`.

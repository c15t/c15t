---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Report a spent request budget as 0 ms

When a consent route's `x-c15t-timeout-ms` budget ran out before the manifest
cache or consent resolution started, the timeout error named a negative
duration, such as "no manifest within -3 ms". It now says 0 ms. Timing is
unchanged: a spent budget already gave up at once.

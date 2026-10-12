---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Load persistence's write code on demand

Persistence reads stored records synchronously at startup, but the code that
writes them loads as its own chunk, after a banner or dialog has shown or at
the first save. Every entry that persists consent loads about 2.4 KB gzip less
JavaScript up front.

Until the chunk loads, a save waits for its record to be stored before it
resolves, and `reconcile()` returns `false`. Stored records and cookies keep
their format.

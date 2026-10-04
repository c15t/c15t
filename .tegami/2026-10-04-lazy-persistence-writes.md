---
packages:
  "@c15t/core": minor
---

### Load persistence's write code on demand

Persistence still reads stored records synchronously at startup, but the
code that writes, reconciles and clears them now loads as its own chunk:
in idle time after the page's `load` event, or at the first save, clear or
reconciliation. Every entry that persists consent loads about 2.6 KB gzip
less JavaScript up front.

Until that chunk has loaded, a save waits for its record to be stored
before its request leaves and before it resolves, `clear()` resets the
kernel at once and clears storage when the chunk lands, and `reconcile()`
returns `false` and runs when it lands. Stored records and cookies keep
their format. Leaving the page (`pagehide`) now writes any record still
waiting to be written.

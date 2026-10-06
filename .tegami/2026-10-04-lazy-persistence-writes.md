---
packages:
  "@c15t/core": minor
---

### Load persistence's write code on demand

Persistence still reads stored records synchronously at startup, but the
code that writes and reconciles them now loads as its own chunk: in idle
time after the page's `load` event once a banner or dialog has been shown,
or at the first save or reconciliation. Every entry that persists consent
loads about 2.4 KB gzip less JavaScript up front.

Until that chunk has loaded, a save waits for its record to be stored
before its request leaves and before it resolves, and `reconcile()` returns
`false` and runs when it lands. If the chunk fails to load, the save keeps
waiting and the chunk is tried again, so a revocation reload never runs
while storage still holds the revoked choice. `clear()` needs no chunk: it
removes stored records and stores the clear epoch before it returns. Stored records and cookies keep
their format. Leaving the page (`pagehide`) now writes any record still
waiting to be written.

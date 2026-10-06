---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Clearing records drops queued saves

`clearRecords()` now drops every consent save still queued for replay, whether
or not browser persistence is mounted. Before, a runtime without persistence
replayed the previous visitor's queued choices after the clear.

A save that fails while records are being cleared is no longer queued after
the clear. Where localStorage is unavailable, failed saves are kept in memory
and retried after the next initialization or when the browser comes back
online, instead of being dropped. Saves queued by earlier releases still
replay.

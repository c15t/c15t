---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Clearing records drops queued saves

`clearRecords()` drops every consent save queued for replay, including one that
fails during the clear, with or without browser persistence. Before, a runtime
without persistence replayed the previous visitor's choices after the clear.

Where localStorage is unavailable, failed saves are kept in memory and retried
on the next initialization or when the browser comes back online.

---
'c15t': patch
'@c15t/tanstack-start': patch
---

Cache the IAB Global Vendor List in-process. The manifest transport and the TanStack Start init route fetched the full list on every IAB init; they now share `fetchCachedGvl`, which keeps a list for the upstream `max-age` (one day when absent), coalesces concurrent misses, and serves the last good list when a refresh fails. `clearGvlCache` is exported alongside it.

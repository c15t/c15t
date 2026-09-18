---
"@c15t/backend": patch
---

A matched IAB rule now decides whether `/init` carries a Global Vendor List, instead of also needing `gvl.enabled: true`. A deployment that configured a vendor scope and a cache resolved its IAB policy correctly and served no list, which left the disclosure surfaces with no vendor to name, and a client cannot fetch one itself. On mobile the gap is total: a device reads the list `/init` brought and never requests another. Configuring `gvl` is now the opt-in, and `gvl.enabled: false` is the one way to decline it while keeping the rest of the block in place. Two things did not change: a deployment with no `gvl` block gets no outbound list request at all, and a scope only ever narrows, so nothing outside `gvl.vendorIds` reaches a visitor. When configured rules resolve as IAB with no `gvl` block, the backend now says so once at startup rather than leaving the gap to surface as a banner that names no vendors.

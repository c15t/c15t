---
'@c15t/core': patch
---

Create the IAB CMP once when an IAB policy supplies the `cmpId` after the
runtime starts. `createIAB` seeds the kernel synchronously, which re-entered
the mount and created the CMP up to 100 times, ending in "Consent listeners
kept updating consent in response to each other".

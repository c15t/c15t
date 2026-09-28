---
packages:
  '@c15t/scripts': minor
  '@c15t/cli': patch
---

### Add a OneDollarStats integration

`oneDollarStats()` from `@c15t/scripts/one-dollar-stats` loads the OneDollarStats tracker after measurement permission. It needs no API key. Tracker settings are forwarded as `data-*` attributes; `hostname` must be a bare host, setting names must be valid attribute names, and `'hash-routing': 'false'` omits the attribute because the tracker treats any value as on. The CLI offers OneDollarStats in its integration picker.

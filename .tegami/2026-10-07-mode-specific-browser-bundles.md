---
packages:
  '@c15t/browser': minor
---

### Add hosted and offline browser bundles

Add `@c15t/browser/hosted` and `@c15t/browser/offline` ES module entries,
plus the `c15t.hosted.js` and `c15t.offline.js` script-tag bundles. Both keep
the stock UI, consent actions, storage, callbacks, script gating and blockers.

The hosted bundle excludes offline policy presets, offline resolution and
manifest transport code. The offline bundle excludes hosted and manifest
transport code. Each entry rejects configuration for another mode. Existing
general, headless and IAB entries remain available.

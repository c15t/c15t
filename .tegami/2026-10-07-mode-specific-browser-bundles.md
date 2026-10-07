---
packages:
  '@c15t/browser': minor
  '@c15t/backend': patch
---

### Make hosted mode the default browser bundle

Make `c15t.js` the hosted script-tag bundle and add `c15t.offline.js` for
browser-only policy resolution. The default bundle now requires a backend
URL or a hosted transport factory. For manifest or custom mode with the
stock UI, use the `@c15t/browser` ES module. The headless and IAB scripts
continue to support those modes.

Add `@c15t/browser/hosted` and `@c15t/browser/offline` ES module entries.
Both keep the stock UI, consent actions, storage, callbacks, script gating
and blockers. The hosted bundle excludes offline policy presets, offline
resolution and manifest transport code. The offline bundle excludes hosted
and manifest transport code. Each entry rejects configuration for another
mode. The general ES module, headless and IAB entries remain available.

Serve the hosted bundle from the self-hosted backend's `/c15t.js` route
with its backend URL already configured. This route now resolves policies
through `/init`. The headless and IAB routes keep their manifest preload.

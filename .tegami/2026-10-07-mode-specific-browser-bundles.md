---
packages:
  '@c15t/browser': minor
  '@c15t/backend': patch
---

### Make hosted mode the default browser bundle

`c15t.js` is the hosted script-tag bundle and requires a backend URL
or a hosted transport factory. Use the new `c15t.offline.js` for browser-only
policy resolution. For manifest or custom mode with the stock UI, use the
`@c15t/browser` ES module. The headless and IAB scripts still support those
modes.

New `@c15t/browser/hosted` and `@c15t/browser/offline` ES module entries keep
the stock UI and leave out code for other modes. Each rejects configuration
for another mode.

The self-hosted backend's `/c15t.js` route serves the hosted bundle with its
backend URL configured and resolves policies through `/init`.

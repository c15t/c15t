---
'@c15t/backend': minor
---

Serve the script-tag builds at `GET /c15t.js` and `GET /c15t.headless.js`, pre-configured for the instance. Each response is the `@c15t/browser` bundle behind a queued `config` call that carries the backend's manifest, so a site that pastes one tag renders a location-independent policy without a second request. The routes share `/manifest`'s cache policy and validator; `script.config` bakes in defaults such as categories and legal links, `script.backendURL` pins the origin, `script.bundles` points at bundle files on runtimes without `@c15t/browser` on disk, and `script.enabled: false` turns them off.

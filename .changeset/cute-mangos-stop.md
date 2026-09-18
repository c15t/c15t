---
"@c15t/cli": patch
"@c15t/core": minor
"@c15t/scripts": minor
---

Add a Cloudflare Zaraz consent bridge with explicit category-to-purpose mapping, denied defaults for unmapped purposes, and queued pageview replay after grants. Add the script `onDispose` callback so integrations can remove listeners when their configuration is removed or the loader is disposed.

Preserve unchanged vendor resources across same-ID configuration updates. Track completed inline execution independently of DOM attachment, remove retained owned elements during configuration teardown, and stop runaway callback reconciliation. Expose Zaraz synchronization failures through `onError`.

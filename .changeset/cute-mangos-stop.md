---
"@c15t/cli": patch
"@c15t/core": minor
"@c15t/scripts": minor
---

Add a Cloudflare Zaraz consent bridge with explicit category-to-purpose mapping, denied defaults for unmapped purposes, and queued pageview replay after grants. Add the script `onDispose` callback so integrations can remove listeners when their configuration is removed or the loader is disposed.

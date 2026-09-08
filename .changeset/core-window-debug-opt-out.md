---
'@c15t/core': minor
---

Add a `windowDebug` runtime option. `createConsentRuntime()` installs a frozen `{ version, pkg, mode }` object on `window.c15t` when it starts; pass `windowDebug: false` when the host owns that global itself, as the script-tag build does.

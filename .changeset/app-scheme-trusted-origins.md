---
'@c15t/backend': patch
'@c15t/schema': patch
---

`trustedOrigins` entries can name a native WebView scheme, such as `capacitor://localhost` for an iOS Capacitor app or `ionic://localhost` for one migrated from `cordova-plugin-ionic-webview`. An entry that names an app scheme is pinned to it: it no longer trusts the same host over `https://`, and its host is matched verbatim, so `capacitor://localhost` never trusts `capacitor://www.localhost`. Entries with a web scheme or none at all keep matching any scheme, as before.

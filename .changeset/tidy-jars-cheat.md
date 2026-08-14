---
'@c15t/backend': patch
---

Support native WebView app schemes in `trustedOrigins`

Origins such as `capacitor://localhost` (the default iOS Capacitor origin), `ionic://localhost`, and custom `iosScheme` values can now be used as trusted origins, matched on both scheme and host:

```ts
trustedOrigins: [
  'https://app.example.com', // your web app
  'capacitor://localhost', // iOS
  'http://localhost', // Android
];
```

Entries with no scheme or an `http(s)`/`ws(s)` scheme are unchanged. An entry naming an app scheme is now pinned to it, which narrows two cases that were broken before: `capacitor://localhost` no longer trusts `capacitor://evil.com`, and no longer matches `https://localhost`. List every origin you serve.

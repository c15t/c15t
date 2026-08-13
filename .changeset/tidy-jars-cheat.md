---
'@c15t/backend': patch
---

Support native WebView app schemes in `trustedOrigins`

Origins such as `capacitor://localhost` (the default iOS Capacitor origin), `ionic://localhost`, and custom `iosScheme` values can now be used as trusted origins and are matched on scheme and host:

```ts
trustedOrigins: [
  'https://app.example.com', // your web app
  'capacitor://localhost', // iOS
  'http://localhost', // Android
];
```

Previously the CORS layer prefixed any entry lacking an `http(s)`/`ws(s)` scheme with `http://`, so `capacitor://localhost` parsed as the hostname `capacitor`. That collapsed every `capacitor://` origin onto a single host, and the two origin matchers disagreed about which requests to allow.

This also closes a hole where trusting `capacitor://localhost` implicitly trusted every other host on that scheme, such as `capacitor://evil.com`.

Only entries that explicitly name an app scheme change behaviour, and those did not work correctly before. Entries with no scheme or an `http(s)`/`ws(s)` scheme remain protocol-agnostic and match exactly as they did previously, so existing configurations are unaffected.

If you set a custom `server.hostname` in your Capacitor config, list the origin your WebView actually sends (e.g. `capacitor://app.example.com`) rather than `capacitor://localhost` — the previous behaviour accepted either.

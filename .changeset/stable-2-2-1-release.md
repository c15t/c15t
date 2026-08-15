---
'c15t': patch
'@c15t/backend': patch
'@c15t/cli': patch
'@c15t/dev-tools': patch
'@c15t/iab': patch
'@c15t/nextjs': patch
'@c15t/node-sdk': patch
'@c15t/react': patch
'@c15t/translations': patch
---

Restore `enabled: false` so all client-side consents are granted, initialization requests are skipped, and consent-gated scripts load immediately.

Fix `www` handling in CORS origin matching. `*.example.com` now accepts `https://www.example.com`, and a schemeless `www.example.com` entry accepts both the apex and `www` forms.

Support native WebView app schemes in `trustedOrigins` (`capacitor://localhost`, `ionic://localhost`, custom `iosScheme` values), matched on both scheme and host.

Declare `hono` as `^4.12.34` rather than an exact pin so you can take Hono security releases without waiting for a new `@c15t/backend`.

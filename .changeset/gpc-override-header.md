---
'@c15t/schema': minor
'@c15t/backend': patch
---

Add `x-c15t-gpc` as the application override for the Global Privacy Control input. Browsers refuse to let scripts set `Sec-*` request headers, so a client that asserts a GPC value on its own init request (for example the hosted transport sending kernel overrides) sends it here. `extractConsentRequestInputs` reads it ahead of `sec-gpc`, `CONSENT_REQUEST_HEADER_NAMES` includes it, and the backend's `GET /init` and CORS allowlist honour it.

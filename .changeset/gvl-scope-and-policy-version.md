---
"@c15t/iab": patch
---

Ask the vendor list endpoint for the publisher's declared vendor scope on every path, not only when the manifest carries no reference. The reference path used to download the whole list and narrow it afterwards, so a publisher resolved server-side pulled all 1,214 vendors: 857KB uncompressed, against 41KB for a three-vendor scope. The filter now also stops being applied above 500 ids, where the query string grows past the request-line limit a CDN enforces and would fail the consent surface outright; above that cap the full list is fetched and narrowed locally, as before. A vendor list whose `tcfPolicyVersion` is missing, fractional, or below one is now rejected at fetch time rather than encoded into a TC String that derives its policy version from that field.

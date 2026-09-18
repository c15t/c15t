---
"@c15t/backend": patch
---

Fetch the vendor list from the endpoint itself instead of `<endpoint>/<language>.json`. That path does not exist upstream and answered every request with a 404, so a self-hosted IAB deployment resolved no Global Vendor List and `/init` never carried the `gvl` field: the disclosure surfaces had no purposes, features, or vendors to name. The publisher's `gvl.vendorIds` scope now travels as the server-side `vendorIds` filter, and above 500 ids, where the query string outgrows the request-line limit a CDN enforces, the full list is fetched and narrowed locally so a wide scope never discloses vendors a publisher did not configure.

---
'@c15t/backend': patch
---

Fix `www` handling in CORS origin matching

Two `trustedOrigins` configurations now match origins they previously rejected:

- `*.example.com` accepts `https://www.example.com`. Every other subdomain already worked.
- A schemeless `www.example.com` entry accepts both `example.com` and `www.example.com`. It previously matched neither.

Wildcards still exclude the apex, unrelated hosts are unaffected, and entries written with a scheme are unchanged.

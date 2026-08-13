---
'@c15t/backend': patch
---

Fix `www` handling in CORS origin matching

Two trusted-origin configurations did not match the origins they should:

- `*.example.com` rejected `https://www.example.com` while allowing every other subdomain. The incoming origin was `www`-stripped to the apex before matching, and a `*.` wildcard deliberately excludes the apex.
- A schemeless `www.example.com` entry matched nothing at all — not the apex, not itself. Schemeless entries skip URL parsing, so `www.` survived normalization on the trusted side while being stripped from the origin. Entries written with a scheme (`https://www.example.com`) were unaffected.

`www.` is no longer stripped from the incoming origin. Equivalence is applied to the trusted list instead, which now carries both the apex and `www.` form of every entry regardless of which was configured.

This widens matching to origins that were previously rejected. Wildcards still exclude the apex (`*.example.com` does not match `example.com`), and unrelated hosts are unaffected — `example.com` still rejects `notexample.com`.

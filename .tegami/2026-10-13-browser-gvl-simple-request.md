---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Load the vendor list without a CORS preflight

In manifest mode, the browser no longer sends the `x-c15t-version` and
`x-c15t-policy-contract` headers when it fetches the Global Vendor List. The
request stays a CORS simple request, so a vendor list on another origin loads
without an `OPTIONS` round trip, and a host that doesn't allow those headers
no longer fails the fetch. The host must still answer with an
`Access-Control-Allow-Origin` header that covers the requesting site.

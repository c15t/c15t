---
packages:
  '@c15t/core': minor
  '@c15t/schema': minor
  '@c15t/backend': minor
  '@c15t/iab': patch
  '@c15t/vue': patch
---

### Send cross-origin `/init` without a CORS preflight

A browser calling a backend on another origin no longer waits for an
`OPTIONS` preflight before `GET /init`. On a first visit that saves a round
trip before the banner shows, about 150 ms on desktop and more on mobile.

The client version, policy contract, country, region and GPC overrides and
the experiment arm now travel as query parameters instead of `x-c15t-*`
headers: `c15tVersion`, `c15tPolicyContract`, `c15tCountry`, `c15tRegion`,
`c15tGpc` and `c15tExperiment`. `Accept-Language` stays a header. The hosted
transport, the inline prefetch script, the early init in Next.js and the IAB
vendor-list reference all build the same request. Server-to-server init calls
keep the headers.

`/init` now defaults to `credentials: 'same-origin'`: it reads and sets no
cookie, so a cross-origin init no longer sends one. Saves still default to
`'include'`. An explicit `credentials` option still applies to both.

`@c15t/backend` reads the new parameters first and the old headers second, so
older clients keep working. `GET /init` now answers any origin with
`Access-Control-Allow-Origin: *` and no credentials, and keeps reflecting a
trusted origin with credentials for older clients. Consent saves and every
other route still answer only `trustedOrigins`. Same-origin init routes in the
framework adapters read the parameters too.

Upgrade the backend before or together with the clients. A backend that
predates this release ignores the parameters: it serves current clients
without contract negotiation, overrides or experiment attribution, and it
blocks their `/init` for an origin outside `trustedOrigins`.

A caller-supplied `headers` option on the hosted transport is still sent as
headers. In a browser, any of them except `accept-language` brings the
preflight back. If your edge strips incoming `x-c15t-*` headers, strip
`c15tCountry`, `c15tRegion` and `c15tGpc` from `/init` requests too.

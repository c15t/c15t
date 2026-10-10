---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Send cross-origin `/init` without a CORS preflight

A browser calling a backend on another origin no longer waits for an
`OPTIONS` preflight before `GET /init`. On a first visit that saves a round
trip before the banner shows, about 150 ms on desktop and more on mobile.

The client version, policy contract, country, region and GPC overrides and
the experiment arm now travel as query parameters instead of `x-c15t-*`
headers: `v`, `contract`, `country`, `region`, `gpc` and `experiment`, as in
`/init?v=3.0.0&country=GB`. `Accept-Language` stays a header. The hosted
transport, the inline prefetch script, the early init in Next.js and the IAB
vendor-list reference all build the same request. Server-to-server init calls
keep the headers.

The journey parameters lose their prefix too: `c15tJourney`,
`c15tJourneyScope` and `c15tStored` are now `journey`, `journeyScope` and
`stored`, on both `/init` and `POST /subjects`. `@c15t/backend` still reads the
old names from `3.0.0-alpha.8` and `alpha.9` clients.

c15t reserves these names on an init URL. If a custom `initURL` already
carries one, c15t replaces it with its own value, so each name appears once.

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
without contract negotiation, overrides, experiment attribution or journey
ids, and it blocks their `/init` for an origin outside `trustedOrigins`.

A caller-supplied `headers` option on the hosted transport is still sent as
headers. In a browser, any of them except `accept-language` brings the
preflight back. If your edge strips incoming `x-c15t-*` headers, strip
`country`, `region` and `gpc` from `/init` requests too.

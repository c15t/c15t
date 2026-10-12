---
packages:
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/node-sdk":
    replay:
      - exit-prerelease(npm:@c15t/node-sdk)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Remove the v2 `jurisdiction` label and `disableGeoLocation`

v3 decides consent from policy rules, so the v2 regulation label (`GDPR`,
`CCPA`, `NONE` and so on) is gone from the API.

- `/init` responses, session reports and `sessions.onReport` no longer carry
  `jurisdiction`. Read `policyResolution`, or the report's `policy`,
  `country` and `region`.
- `@c15t/schema` removes `jurisdictionCodes`, `jurisdictionCodeSchema`,
  `JurisdictionCode` and `checkJurisdiction`. `@c15t/core` and `c15t` remove
  the `LocationInfo`, `ConsentBannerResponse` and `JurisdictionCode` types.
- `disableGeoLocation` is removed. To show everyone the same banner, use one
  policy rule with `match: { isDefault: true }`. To test a region's rule, set
  `overrides: { country: 'US' }` on the client.
- The `/init` translations schema is one shape with optional keys.
  `completeTranslationsSchema`, `partialTranslationsSchema`, the `partial*`
  section schemas and the deprecated `frame` key are removed.
  `titleDescriptionSchema` makes `title` and `description` optional.
- The backend ignores `jurisdiction` sent by 2.x clients.
- Migration 7 makes `runtimePolicyDecision.jurisdiction` nullable. Run
  `@c15t/cli self-host migrate --apply` before deploying this backend.

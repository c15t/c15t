---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Throw when an IAB policy has no `IABProvider`

When a visitor's policy used the `iab` model and the backend sent its vendor
list, an app without `IABProvider` showed no consent UI at all: the standard
`ConsentBanner` and `ConsentDialog` do not handle the IAB model. They now
throw an `IABUnavailableError` (code `C15T_IAB_UNAVAILABLE`) during render,
on the server and in the browser:

> c15t: this visitor's policy uses IAB TCF, but no <IABProvider> is mounted.

Render `IABProvider` from `c15t/react/iab` for those visitors, or remove the
`iab` model from the policy. A backend that answers `gvl: null` turns IAB off
for the request, and nothing throws.

`@c15t/core` exports `IABUnavailableError`, `IAB_UNAVAILABLE_ERROR_CODE` and
`policyNeedsIAB()`, which adapters use to decide when to throw.

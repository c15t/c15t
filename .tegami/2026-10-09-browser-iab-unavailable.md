---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Throw when an IAB policy reaches a page without the IAB UI

With `c15t.js`, `@c15t/browser`, or the IAB build with `iab: false`, a backend
policy that used the `iab` model left the visitor with no banner: the stock
UI stands aside for that model. The client now emits an `error` event and
throws an `IABUnavailableError` (code `C15T_IAB_UNAVAILABLE`) as an uncaught
error. Load `c15t.iab.js` or `@c15t/browser/iab` for those visitors, or
remove the `iab` model from the policy.

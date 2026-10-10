---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Throw when an IAB policy reaches a site without `iab`

When a visitor's policy used the `iab` model and the backend sent its vendor
list, a site without `iab` ran the IAB model with no CMP to answer for it:
Accept recorded nothing. The server render now throws an
`IABUnavailableError` (code `C15T_IAB_UNAVAILABLE`), and a page the browser
resolves itself throws it there as an uncaught error. Set `iab` in the
integration options, or remove the `iab` model from the policy. A backend that
answers `gvl: null` turns IAB off for the request, and nothing throws.

The page script also no longer carries the CMP mount and the lazy `@c15t/iab`
loader, about 1.7 KB minified, unless `iab` is set.

---
packages:
  '@c15t/browser': patch
---

### Show the banner from a bundled manifest when every location gets the same one

`manifest()` used to call `/init` whenever a policy rule was keyed by country
or region and the browser did not know the visitor's location, so the banner
waited for that round trip. It now resolves in the browser when every location
gets the same banner: the rules share model, prompt, categories, copy and GPC
handling, a default rule covers unlisted countries, and with region rules, a
fallback rule covers a missing region. The save asserts the unknown-location rule, which the backend
recomputes from the same manifest.

`manifestNeedsLocation()` follows the same rule and returns `false` for such a
manifest. Manifests where some location gets a different banner, or none, still
call `/init`, as do IAB policies and visitors whose language the bundle cannot
translate.

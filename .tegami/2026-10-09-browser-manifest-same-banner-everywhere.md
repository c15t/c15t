---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
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
call `/init`, as do IAB policies behind country or region rules. So do
visitors in any language but English when the location is unknown, because the
browser bundle carries English copy only and `/init` returns their language in
full.

A manifest resolved this way reports no location: `getSnapshot().location`
and `useLocation()` have a `null` country and region. Supply the country
through `inputs` if your code reads it. When IAB GPP is on, through the
runtime's `gpp` option, `<ConsentGPP>` or `mountGPP()`, an unknown location
still calls `/init`, because the GPP US sections need the visitor's state. The
script-tag build counts GPP as on unless `c15t.init()` gets `gpp: false`.
Transport factories see this as `gppEnabled` on their context.

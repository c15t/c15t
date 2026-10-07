---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Remove unused banner card animation rules

The banner and IAB banner stylesheets drop the `.card[data-state]` rules and
the `--consent-banner-entry-animation`, `--consent-banner-exit-animation`,
`--iab-consent-banner-entry-animation` and
`--iab-consent-banner-exit-animation` variables. The rules never applied, so
banners animate as before.

`setupColorScheme()` no longer throws where `matchMedia` is missing, as in
some embedded webviews. `'system'` is light there.

---
packages:
  '@c15t/ui': patch
---

### Remove unused banner card animation rules

The banner and IAB banner stylesheets no longer carry `.card[data-state]` animation rules or the `--consent-banner-entry-animation`, `--consent-banner-exit-animation`, `--iab-consent-banner-entry-animation` and `--iab-consent-banner-exit-animation` variables that fed them. No banner ever set `data-state` on its card, so the rules never applied. The banners animate through their visible, hidden and entering classes as before. The `iab-consent-banner.css` animations export keeps its keyframes.

`setupColorScheme()` no longer throws where `matchMedia` is missing, as in some embedded webviews. `'system'` is light there. The motion token TSDoc now gives the real duration defaults: 80ms, 150ms and 200ms.

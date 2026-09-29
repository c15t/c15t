---
packages:
  '@c15t/astro': patch
---

### Accept every banner prop on `ConsentBannerDeferred`

`ConsentBannerDeferred` now accepts `dismissButtonText` and `hideBranding` in its prop types. It already passed them to `ConsentBanner`, but `astro check` rejected them.

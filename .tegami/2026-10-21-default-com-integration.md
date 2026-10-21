---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
---

### Add Default consent integration

Add Default Pixel and standalone Forms SDK helpers with shared vendor metadata, framework examples and CLI setup. The Pixel waits for measurement consent by default and offers an opt-in `loadMode: 'always'`. The standalone Forms SDK waits for functionality consent and has no `loadMode` option. Both accept a custom category condition and prevent conflicting Default loaders from starting in one document.

Forward measurement and marketing choices before the Pixel executes or the SDK initializes, and send both fields as false when the helper or vendor lacks permission. The Pixel's `always` mode allows loader, form-catalogue and form-submission requests before consent. Document withdrawal and scheduler storage limits, including activity that requires a reload to stop and the Pixel's continued loading in `always` mode.

Include typed form submissions, interaction warmup, scheduler events and element targets.

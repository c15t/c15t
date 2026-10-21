---
packages:
  '@c15t/integrations': minor
  '@c15t/cli': patch
  '@c15t/scripts': patch
  '@c15t/core': patch
---

### Add Default consent integration

Add Default Pixel and standalone Forms SDK helpers with shared vendor metadata, framework examples and CLI setup. The Pixel waits for measurement consent by default and offers an opt-in `loadMode: 'always'`. The standalone Forms SDK waits for functionality consent and has no `loadMode` option. Both accept a custom category condition and prevent conflicting Default loaders from starting in one document.

Forward measurement and marketing choices before the Pixel executes or the SDK initializes, and send both fields as false when the helper or vendor lacks permission. The Pixel's `always` mode allows loader, form-catalogue and form-submission requests before consent. Document withdrawal and scheduler storage limits, including activity that requires a reload to stop and the Pixel's continued loading in `always` mode.

Forward denial to the owned SDK after its final registration is removed or disposed, including when replacing its loader. Apply supported SDK configuration updates while the helper is live and permitted, with consent forwarded first. Keep identity and session startup unchanged. Omitted endpoint and scheduler origins restore SDK defaults; omitted scheduler display restores `true`.

Preserve a DOM script's lifecycle when a replacement configuration keeps the same resource and `onDispose` function. Changing that function still disposes the previous configuration. Callback-only scripts with disposal hooks still tear down when their configuration object is replaced.

Include typed form submissions, interaction warmup, scheduler events and element targets, the Pixel's public methods and partial consent updates.

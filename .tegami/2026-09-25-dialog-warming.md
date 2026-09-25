---
packages:
  "@c15t/react": patch
---

### Load the consent dialog before it opens

The deferred `<ConsentDialog />` now starts loading earlier, so the first open doesn't wait for its download.

- Every button that opens the dialog loads it on hover or focus: the stock `<ConsentBanner />` Customize button, `ConsentDialogLink`, `ConsentDialogTrigger`, and the `ConsentGate` button. Before, only `ConsentBanner.PolicyActions` did this. Handlers you pass as `onFocus` or `onPointerEnter` still run.
- While the banner is shown or one of those buttons is mounted, the dialog also loads in the browser's first idle period after the page's `load` event. That covers a tap or keyboard open with no hover or focus first. It's skipped with Save-Data on, on 2G connections, and offline. A visit with saved consent and nothing that opens the dialog doesn't download it.
- Set `preloadDialog: 'intent'` in the provider options to load only on hover, focus or open.
- A preload that fails, for example offline, no longer breaks the dialog. The next hover, focus or open retries the download.

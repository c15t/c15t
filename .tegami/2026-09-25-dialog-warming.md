---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Load the consent dialog before it opens

The deferred `<ConsentDialog />` starts loading before the first open.

- Buttons that open the dialog load it on hover or focus. This covers the
  `<ConsentBanner />` Customize button, `ConsentDialogLink`,
  `ConsentDialogTrigger` and the `ConsentGate` button.
- While the banner or one of those buttons is shown, the dialog also loads when
  the browser is idle after `load`. This is skipped with Save-Data, on 2G and
  offline.
- Set `preloadDialog: 'intent'` in the provider options to load only on hover,
  focus or open.
- A failed preload no longer breaks the dialog. The next attempt retries.

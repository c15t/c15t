---
packages:
  "@c15t/react": patch
---

### Preload the consent dialog from the stock banner

The stock `<ConsentBanner />` Customize button now starts loading the deferred `<ConsentDialog />` on hover or focus. Before, only `ConsentBanner.PolicyActions` did this, so most apps loaded the dialog after the click. Other buttons that open the dialog, such as `ConsentDialogLink` and the `ConsentGate` button, preload it too. Handlers you pass as `onFocus` or `onPointerEnter` still run.

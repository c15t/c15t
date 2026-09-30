---
packages:
  '@c15t/svelte': patch
---

### Accept `disableAnimation` on the Svelte dialogs

`ConsentDialog` and `IABConsentDialog` take a `disableAnimation` prop that overrides the provider's `disableAnimation` for that dialog, as `ConsentBanner` and the React dialogs already do. Before, `IABConsentDialog` had no prop and always faded its backdrop in unless the provider disabled animation.

---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Accept `disableAnimation` on the Svelte dialogs

`ConsentDialog` and `IABConsentDialog` take a `disableAnimation` prop that overrides the provider's `disableAnimation` for that dialog, as `ConsentBanner` and the React dialogs already do.

The IAB dialog's backdrop now fades in when the dialog opens, like the consent dialog's and the banners'. It used to appear at full opacity at once. `disableAnimation` on the dialog or the provider turns the fade off, and so does a reduced-motion preference.

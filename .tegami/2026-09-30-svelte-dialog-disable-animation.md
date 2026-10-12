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

`ConsentDialog` and `IABConsentDialog` take a `disableAnimation` prop that
overrides the provider's, as `ConsentBanner` and the React dialogs do. The IAB
dialog's backdrop fades in on open, like the other dialogs. `disableAnimation`
or a reduced-motion preference turns the fade off.

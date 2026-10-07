---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Keep the dialog and IAB styles out of the Svelte banner's first load

Every page with a Svelte `ConsentBanner` used to ship the class maps, and in
some cases the CSS, of the consent dialog, IAB banner and IAB dialog. The
banner now loads only its own.

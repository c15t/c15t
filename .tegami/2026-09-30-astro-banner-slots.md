---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Apply `theme.slots` to the Astro banners and dialog islands

`<ConsentBanner />`, `<IABConsentBanner />` and their browser-rendered copies
on prerendered pages read `theme.slots` for their parts, such as
`consentBannerCard`, `iabConsentBannerFooter`, `buttonPrimary` and
`buttonSecondary`. Before, only `theme.consentActions` applied. Slot classes
follow the stock ones, `style` renders inline, and `noStyle: true` replaces
that part's stock classes.

The preference and IAB dialogs honor `theme.slots` with `ui: 'react'` and
`ui: 'vue'` too. There `noStyle` has no effect, and slot classes apply on top
of the stock ones.

Numeric `style` values get `px` where the property takes a unit. The banners
also apply the assigned experiment arm's `theme.slots`, `consentActions` and
`presentation`.

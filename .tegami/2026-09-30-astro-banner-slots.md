---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Apply `theme.slots` to the Astro banners and dialog islands

`<ConsentBanner />` and the banner the browser renders on prerendered pages now read `theme.slots` for their parts: `consentBanner`, `consentBannerCard`, `consentBannerHeader`, `consentBannerTitle`, `consentBannerDescription`, `consentBannerFooter`, `consentBannerFooterSubGroup`, `consentBannerRights`, `consentBannerRightLink`, `consentBannerTag`, `consentBannerOverlay`, `buttonPrimary` and `buttonSecondary`. Before, the banner read only `theme.consentActions`, so classes and styles set there were ignored. A slot's classes follow the stock ones, its `style` renders inline, and `noStyle: true` on a slot replaces that part's stock classes.

`<IABConsentBanner />` and its browser-rendered copy read `iabConsentBanner`, `iabConsentBannerCard`, `iabConsentBannerHeader`, `iabConsentBannerFooter`, `iabConsentBannerTag`, `iabConsentBannerOverlay`, `buttonPrimary` and `buttonSecondary` the same way.

The preference and IAB dialogs now honor `theme.slots` with `ui: 'react'` and `ui: 'vue'` too. Those islands style parts through the provider's `components` option, so the integration translates each slot to its `components` entry (`consentDialogCard` to `dialog.card`, `toggle` to `switch.root`, and so on). A slot's `noStyle` flag has no `components` equivalent there: its classes apply on top of the stock ones. The Svelte island already read `theme.slots`.

Numeric slot `style` values get `px` where the property takes a unit (`{ padding: 8 }` renders `padding:8px`), and unitless properties such as `opacity` or `zIndex` keep the bare number. The banners now apply the assigned experiment arm's `theme.slots` and `consentActions` over the host theme's, on the server and in the browser-rendered copy. The browser-rendered copy also applies the arm's `presentation`, as the server render already did.

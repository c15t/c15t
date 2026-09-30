---
packages:
  '@c15t/astro': patch
---

### Apply `theme.slots` to the Astro banners and dialog islands

`<ConsentBanner />` and the banner the browser renders on prerendered pages now read `theme.slots` for their parts: `consentBanner`, `consentBannerCard`, `consentBannerHeader`, `consentBannerTitle`, `consentBannerDescription`, `consentBannerFooter`, `consentBannerFooterSubGroup`, `consentBannerRights`, `consentBannerRightLink`, `consentBannerTag`, `consentBannerOverlay`, `buttonPrimary` and `buttonSecondary`. Before, the banner read only `theme.consentActions`, so classes and styles set there were ignored. A slot's classes follow the stock ones, its `style` renders inline, and `noStyle: true` on a slot replaces that part's stock classes.

`<IABConsentBanner />` and its browser-rendered copy read `iabConsentBanner`, `iabConsentBannerCard`, `iabConsentBannerHeader`, `iabConsentBannerFooter`, `iabConsentBannerTag`, `iabConsentBannerOverlay`, `buttonPrimary` and `buttonSecondary` the same way.

The preference and IAB dialogs now honor `theme.slots` with `ui: 'react'` and `ui: 'vue'` too. Those islands style parts through the provider's `components` option, so the integration translates each slot to its `components` entry (`consentDialogCard` to `dialog.card`, `toggle` to `switch.root`, and so on). A slot's `noStyle` flag has no `components` equivalent there: its classes apply on top of the stock ones. The Svelte island already read `theme.slots`.

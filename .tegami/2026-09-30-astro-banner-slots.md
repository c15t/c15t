---
packages:
  '@c15t/astro': patch
---

### Apply `theme.slots` to the Astro consent banner

`<ConsentBanner />` and the banner the browser renders on prerendered pages now read `theme.slots` for their parts: `consentBanner`, `consentBannerCard`, `consentBannerHeader`, `consentBannerTitle`, `consentBannerDescription`, `consentBannerFooter`, `consentBannerFooterSubGroup`, `consentBannerRights`, `consentBannerRightLink`, `consentBannerTag`, `consentBannerOverlay`, `buttonPrimary` and `buttonSecondary`. Before, the banner read only `theme.consentActions`, so classes and styles set there were ignored. A slot's classes follow the stock ones, its `style` renders inline, and `noStyle: true` on a slot replaces that part's stock classes.

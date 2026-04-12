---
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/ui': patch
'@c15t/translations': patch
---

Refine prebuilt consent-surface branding so it feels attached to the UI instead of appended.

- `@c15t/react`: add attached branding tags to the stock consent banner, consent dialog, IAB banner, and IAB dialog; localize the branding copy through translations; and add a `hideBranding` prop to the stock `ConsentBanner` component.
- `@c15t/nextjs`: keep the published stylesheet entrypoints aligned with the updated prebuilt branding treatment while simplifying stylesheet distribution to reference upstream package styles directly.
- `@c15t/ui`: update the shared consent branding tag styles for tighter edge attachment, smaller visual footprint, and consistent banner/dialog treatment across standard and IAB surfaces.
- `@c15t/translations`: add the shared localized branding copy used by the updated prebuilt consent surfaces.

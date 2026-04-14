---
'@c15t/react': minor
'@c15t/ui': minor
---

Remove the legacy stock-branding theme keys and require the new explicit tag slots for prebuilt consent surfaces.

- `@c15t/react`: stop resolving stock banner/dialog/widget/IAB branding tags through legacy footer-branding aliases and render the standalone widget/dialog tags without the old footer-wrapper compatibility path.
- `@c15t/ui`: add explicit branding tag slots for each prebuilt surface: `consentBannerTag`, `consentDialogTag`, `consentWidgetTag`, `iabConsentBannerTag`, and `iabConsentDialogTag`.

Breaking change:

- `consentWidgetBranding` has been removed. Use `consentWidgetTag`.
- `consentDialogFooter` no longer styles the stock dialog branding tag. Use `consentDialogTag`.
- Style stock banner and IAB branding tags via the new explicit tag slots instead of footer-related keys.

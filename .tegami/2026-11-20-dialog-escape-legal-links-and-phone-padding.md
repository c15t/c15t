---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/vue': patch
---

### Fix Escape dialog stacking, legal link attributes, and phone padding

- **Escape closes only the top dialog**: With another dialog open over the consent dialog, pressing Escape closed both. In Vue, two open `DialogContent` primitives also both closed. Escape now closes only the dialog opened last and skips keys another dialog already handled.
- **Skip Vue legal links with no URL**: A legal link listed in `bannerLegalLinks` or `dialogLegalLinks` without an `href` in `legalLinks` rendered as `<a href="#">`. Vue now omits that link, and `ConsentLink` accepts an `href` prop and renders nothing when neither the prop nor `legalLinks` gives a URL.
- **Add `rel="noopener noreferrer"` to new-tab legal links**: Default legal links in React and Svelte rendered `target="_blank"` without `rel`, and Vue `ConsentLink` links configured with `target: '_blank'` also omitted `rel`. Legal links opening in a new tab now default to `rel="noopener noreferrer"` unless a custom `rel` is configured.
- **Align banner and dialog padding on phones**: The floating banner and choice wall now align their header text and footer buttons on one inset (`--consent-banner-padding-mobile` below 640px and `--consent-banner-padding` from 640px up). Below 640px, the preferences dialog card uses `--consent-dialog-card-padding-mobile` (16px) so its content aligns with the branding tag and gains horizontal space.

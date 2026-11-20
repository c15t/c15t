---
packages:
  '@c15t/iab': patch
  '@c15t/browser': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/vue': patch
  '@c15t/dev-tools': patch
  '@c15t/schema': patch
---

### Fix IAB TCF signals and vendor list disclosures

- **Keep publisher restrictions off unlisted vendors**: The TC string encoder no longer joins two restricted vendors into one range across vendor IDs omitted from a scoped vendor list. Returning visitors no longer see the banner again when you add a vendor whose ID sits between two restricted vendors.
- **Ignore legitimate interest on consent-only purposes**: Purposes 1, 3, 4, 5 and 6 allow consent only under TCF Policies Appendix A. Accept All, `setPurposeLegitimateInterest`, `setVendorLegitimateInterest`, restored receipts, headless dialog data and the stock preference panels now ignore those purposes when a custom vendor declares them in `legIntPurposes`.
- **Match legitimate interest controls to what Save encodes**: Untouched legitimate interest controls in React, Svelte and Vue now show the same state that Save writes to the TC string, allowing only signals in the draft or introduced by a publisher restriction.
- **Restrict vendor links to absolute http and https URLs**: Vendor privacy policy, legitimate interest and storage disclosure links now pass through `resolveIABSafeUrl` from `@c15t/iab/headless`. Non-http(s) schemes, relative paths and protocol-relative URLs are dropped and render no link.
- **Show the standard TCF Features explanation on vendor disclosures**: The script-tag vendor disclosures and the React and Svelte vendor lists now display each feature's description and the standard Features text from `gvl.standardTexts.features`, falling back to `iab.preferenceCenter.features.description`.

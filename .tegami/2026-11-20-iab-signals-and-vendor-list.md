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

### Fix IAB TCF signals and vendor disclosures

- Restricting two vendors no longer restricts the vendors between them.
- Purposes that allow consent only (1, 3, 4, 5 and 6) no longer get a
  legitimate interest signal from a custom vendor.
- Legitimate interest switches show what Save records.
- Vendor links render only for absolute `http` and `https` URLs.
- Vendor disclosures show the standard TCF Features text.

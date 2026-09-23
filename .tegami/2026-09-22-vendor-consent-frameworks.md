---
packages:
  "@c15t/vue": minor
  "@c15t/svelte": minor
  "@c15t/core": patch
  "@c15t/react": patch
---

### Show vendors in the Vue and Svelte preference centers

Show vendors in the Vue and Svelte preference centers, the same cards the React one renders. Pass `vendors` in the Nuxt module or Vue plugin config, or in `ConsentManagerProvider` options in Svelte, and each category lists its vendors under its description with a switch per vendor. Vendor switches edit the consent draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. In Vue `useConsentDraft()` gains `vendors` and `setVendor`; in Svelte the manager state gains `selectedVendors`, `setSelectedVendor` and `getDisplayedVendors`. `vendorsListedUnder` is exported from `c15t` so every framework lists the same vendors under a category, and the React vendor name carries a `consent-widget-vendor-name-*` test id. The cross-framework parity suite now compares the vendor rows in every framework.

The Vue preference center's switches and category rows now take their class names from the `@c15t/ui` component style entries, the ones the React components use, so their CSS ships with the component. A Nuxt app rendered both unstyled before: the switch collapsed to a 16 by 6 pixel outline and closed rows stayed visible, because the primitive class maps expect the aggregated stylesheet that Vue apps never import.

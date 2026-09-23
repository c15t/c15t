---
packages:
  c15t: minor
  "@c15t/core": minor
  "@c15t/schema": minor
  "@c15t/scripts": minor
  "@c15t/dev-tools": minor
  "@c15t/backend": minor
  "@c15t/react": minor
  "@c15t/nextjs": minor
  "@c15t/tanstack-start": minor
  "@c15t/ui": minor
  "@c15t/translations": minor
  "@c15t/vue": minor
  "@c15t/svelte": minor
---

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the `vendors` option or the backend manifest, then name them with `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and its vendor is not off; `alwaysLoad` scripts see the result in their callbacks.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte list each category's vendors with a switch per vendor. Switches edit the draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. React adds `useVendorDraft`, `useVendorAllowed`, `useDeclaredVendors` and `useVendorChoice`; `useConsentDraft` gains `vendors` and `setVendor`; the Svelte manager state gains `selectedVendors` and `setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and reach the backend as `vendorChoice`. Migration `4-vendor-choice` adds the column, so run the migrator before deploying. A denial has no expiry and does not delete cookies the vendor already set.

Also fixed: the Vue preference center rendered its switches and category rows unstyled in Nuxt, and the Vue and Svelte category description colour differed from React's.

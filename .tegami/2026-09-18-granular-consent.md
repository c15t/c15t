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

Let a visitor grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the runtime's `vendors` option or the backend manifest's `vendors`, then name them through `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and the visitor has not turned its vendor off; `alwaysLoad` scripts still mount and see the result in their callbacks. The slug is inert under an `iab` policy.

Vendor denials live in a new `<storageKey>-vendors` cookie and localStorage entry, hydrate on the server from the request cookie header, and reach the backend as `vendorChoice` on save. `kernel.set.vendorDraft()`, `runtime.stageVendorConsent()`, `save({ ...categories, vendors })`, the `vendors:set` and `vendors:recorded` events, and `ScriptCallbackInfo.vendor` are new. `@c15t/scripts` integrations set `vendor` to their manifest slug and send every Consent Mode or RudderStack category as denied while their vendor is off. Accept all and reject all clear the denial list. New vendors default to on inside a granted category. Turning a vendor off does not delete cookies that vendor already set, and a denial has no expiry. Declaring backend vendors changes the manifest revision. `Script.vendorId` is IAB-only.

The backend stores the map as sent: `POST /subjects` accepts `vendorChoice`, retrying the same act with a different map is a `CONFLICT`, and `GET /subjects/:id` returns each row's map plus the most recent act's as `subjectVendorChoice`. Migration `4-vendor-choice` adds the nullable `consent.vendorChoice` JSON column; run the migrator before deploying.

The preference centers list each category's vendors under its description with a switch per vendor, in React, Next.js, TanStack Start, Vue, Nuxt and Svelte alike. Vendor switches edit the consent draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. Pass `vendors` to `ConsentProvider`, to `ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start`, to the Nuxt module or Vue plugin config, or to `ConsentManagerProvider` options in Svelte. React gains `useDeclaredVendors`, `useVendorChoice`, `useVendorAllowed` and `useVendorDraft`, and `ConsentWidget.VendorList` as a compound part; `useConsentDraft` gains `vendors` and `setVendor` in React and Vue; the Svelte manager state gains `selectedVendors`, `setSelectedVendor` and `getDisplayedVendors`. Slot keys `vendor-list.*`, the `@c15t/ui/styles/components/vendor-list` stylesheet, `consentManagerDialog.vendors` translations and `vendorsListedUnder` from `c15t` support it. Dev-tools lists declared vendors on the Consents tab, and the cross-framework parity suite compares the vendor rows in every framework.

Two fixes ride along. The Vue preference center's switches and category rows now take their class names from the `@c15t/ui` component style entries React uses, so their CSS ships with the component; a Nuxt app rendered both unstyled before. And the category description in the Vue and Svelte preference centers now renders in the same colour as React's, with Svelte's switches on the shared switch class map.

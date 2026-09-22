---
packages:
  c15t: minor
  "@c15t/react": minor
  "@c15t/nextjs": minor
  "@c15t/tanstack-start": minor
  "@c15t/ui": minor
  "@c15t/translations": minor
  "@c15t/schema": minor
  "@c15t/dev-tools": minor
---

### Show vendors in the React preference center

Show vendors in the React preference center. `ConsentProvider` accepts `vendors`, as does `ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start`; `ConsentWidget` and `ConsentDialog` then list each category's vendors under its description with a switch per vendor. Vendor switches edit the consent draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. New hooks `useDeclaredVendors`, `useVendorChoice` and `useVendorAllowed`; `useConsentDraft` gains `vendors` and `setVendor`, and `useVendorDraft` exposes that slice alone, with `isStale` and `reset`, for a custom vendor control; `ConsentWidget.VendorList` is a compound part. Slot keys `vendor-list.*`, the `@c15t/ui/styles/components/vendor-list` stylesheet and `consentManagerDialog.vendors` translations support it. Dev-tools lists declared vendors on the Consents tab. Vue and Svelte preference centers do not render vendor rows yet.

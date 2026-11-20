---
packages:
  "@c15t/browser": patch
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/svelte": patch
  "@c15t/vue": patch
  "c15t": patch
---

### Fix IAB TCF banner, dialog and save error handling

- **Show registered vendor data categories in the script-tag UI.** Vendor details in `@c15t/browser` now read `dataDeclaration` from the Global Vendor List before falling back to `dataCategories` for custom vendors, so the Data Categories section renders for registered vendors.
- **Inline the partners link in the script-tag IAB banner.** `@c15t/browser` now splits the banner description around the partners link button instead of rendering the partner count twice.
- **Open the Vue IAB dialog on the vendors tab from the banner partners link.** Clicking the partners link in the Vue IAB banner now opens the dialog on the vendor list, and reopening the dialog lands on the tab the visitor left it on in both Nuxt and plain Vue.
- **Report failed IAB saves once.** `saveIABConsentSurface` now reports failures through an optional `onError` callback (`console.error` by default) and resolves `{ ok: false }` instead of rethrowing into silent `catch` blocks across React, Svelte and Vue. `@c15t/browser` forwards failures to its `error` event once and continues resolving `{ ok: false }`.
- **Stop Vue IAB saves without a mounted CMP handle from recording an empty choice.** `useConsentIabSave()` now records nothing when no CMP handle is mounted instead of saving a choice without a TC string.

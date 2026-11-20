---
packages:
  "@c15t/browser": patch
  "@c15t/core": patch
  "@c15t/react": patch
  "@c15t/svelte": patch
  "@c15t/vue": patch
  "c15t": patch
---

### Fix the IAB banner and dialog

- The script-tag UI shows a registered vendor's data categories.
- The script-tag IAB banner shows the partner count once.
- In Vue, the partners link opens the dialog on the vendor list.
- A failed IAB save is reported once. `saveIABConsentSurface` resolves
  `{ ok: false }` instead of rejecting.
- Vue records no IAB choice when no CMP is mounted.

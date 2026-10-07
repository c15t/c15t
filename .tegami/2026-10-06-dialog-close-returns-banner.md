---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/vue': patch
  '@c15t/astro': patch
  '@c15t/browser': patch
---

### Closing the dialog brings back a banner the visitor still owes

Closing preferences with Escape, `closeUI()` or `closeDialog()` left no banner
and no dialog, even when the policy still required a choice. Closing the dialog
leaves the same surface a save would. The banner returns while a choice or
notice is owed. `showConsentSurface(kernel, 'none')` follows the same rule while
the dialog is open.

`useHeadlessIABConsentUI()` from `@c15t/react/iab` no longer flashes the banner
while the TC string encodes. The Vue dialog no longer handles one Escape press
twice.

---
packages:
  '@c15t/core': patch
  '@c15t/react': patch
  '@c15t/vue': patch
  '@c15t/astro': patch
  '@c15t/browser': patch
---

### Closing the dialog brings back a banner the visitor still owes

A visitor who opened preferences from the banner and closed them with Escape,
or through `closeUI()` or `closeDialog()`, was left with no banner and no
dialog, even though the policy still required a choice. Closing the dialog now
leaves the same surface a save would: the banner while a choice or notice is
owed, and nothing once one is recorded. `showConsentSurface(kernel, 'none')`
follows the same rule when the dialog is open. Hiding a banner that is already
showing still works as before.

The React `useHeadlessIABConsentUI()` hook from `@c15t/react/iab` now closes
the surface through `saveIABConsentSurface`, so its `acceptAll()`,
`rejectAll()` and `savePreferences()` no longer flash the banner while the TC
string encodes, and bring the surface back if nothing was recorded. The Vue
dialog no longer handles one Escape press twice.

---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
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

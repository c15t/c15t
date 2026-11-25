---
packages:
  '@c15t/browser': patch
  '@c15t/core': patch
  '@c15t/dev-tools': patch
  '@c15t/vue': patch
---

### Preference switches match what is in effect

- A category that Global Privacy Control denies starts off when the visitor has
  no saved choice, and saving records it as denied.
- Vue and the script-tag UI show the restriction notice on a saved grant.
- Categories start on under a `none` policy.

---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Preference switches match what is in effect

- A category that Global Privacy Control denies starts off when the visitor has
  no saved choice, and saving records it as denied.
- Vue and the script-tag UI show the restriction notice on a saved grant.
- Categories start on under a `none` policy.

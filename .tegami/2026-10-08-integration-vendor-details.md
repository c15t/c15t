---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
---

### List integration vendors in the preference dialog

`@c15t/integrations` helpers now set `vendorDetails` (name and privacy policy)
on their scripts, so the dialog gives each vendor its own switch without a
`vendors` declaration. A vendor declared in `vendors` or by the backend still
replaces these details.

---
packages:
  "@c15t/iab":
    replay:
      - exit-prerelease(npm:@c15t/iab)
---

### Show saved IAB choices in the preference dialog after a reload

A returning visitor who opened the IAB preference dialog saw every switch off,
even though `__tcfapi` reported their saved consent, and pressing Save revoked
everything. The dialog starts from the stored TC string in every framework and
in `@c15t/browser`.

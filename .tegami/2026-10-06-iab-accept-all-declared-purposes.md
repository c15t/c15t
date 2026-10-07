---
packages:
  '@c15t/iab': major
---

### Accept All consents only to purposes your vendors declare

Under an IAB policy, Accept All used to consent to all 11 TCF purposes and every
special feature, including ones no listed vendor declares. Accept All sets
consent, legitimate interest and special feature opt-ins only for what your
vendors declare, as the TCF Policies require.

This can change which c15t categories Accept All grants. A category whose
purposes no listed vendor declares stays denied: `experience` (purposes 5 and
6), `functionality` (10 and 11), `measurement` (7 to 9) or `marketing` (2 to 4).
Scripts, iframes and network rules gated on it no longer load after Accept All.

To check, click Accept All on a fresh visit and read `effectivePermissions`. If
a category your scripts need stays denied, declare that processing as a custom
vendor through `customVendors`, or gate the script on a category your vendors
cover. See "Categories under an IAB policy" in the consent state reference.

---
packages:
  '@c15t/iab': major
---

### Accept All consents only to purposes your vendors declare

Under an IAB policy, Accept All used to consent to all 11 TCF purposes and
every special feature in the Global Vendor List, including ones no vendor in
your list declares and the preference centre never showed. The TCF Policies
allow no consent signal for a purpose the visitor was not shown. Accept All now
sets vendor and purpose consent only for declared consent purposes. It sets
separate vendor and purpose legitimate-interest signals for declared
legitimate-interest purposes, and opts in to declared special features.
Everything else stays off in the TC string.

This can change which c15t categories Accept All grants. A category is granted
when every purpose in it that a listed vendor processes on consent is
consented. A category none of whose purposes a listed vendor declares now stays
denied after Accept All: `experience` (purposes 5 and 6), `functionality` (10
and 11), `measurement` (7 to 9) or `marketing` (2 to 4). Scripts, iframes and
network rules gated on that category no longer load after Accept All.

What to check: on a fresh visit under your IAB policy, click Accept All and read
`effectivePermissions`. For a category your own scripts need that stays denied,
declare the processing as a custom vendor with those purposes through
`customVendors`, or gate the script on a category your vendors' purposes cover.
See "Categories under an IAB policy" in the consent state reference.

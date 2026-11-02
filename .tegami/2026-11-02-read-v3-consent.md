---
packages:
  c15t: patch
---

### Read consent saved by c15t v3

c15t v3 saves consent under the same `c15t` cookie and localStorage key as
v2, in a new format. When a site on v3 and a site on v2 share a domain, a
choice made on the v3 site broke the v2 site: its consent state was
`undefined`, `has()` threw a `TypeError`, and the banner stayed hidden.

v2 now reads a v3 record as a v2 choice. The visitor's category choices,
subject ID, external ID and IAB custom vendor choices carry over, and the v3
record is left in place until the visitor saves again on the v2 site. A
stored value in any other unknown format counts as no consent, so the banner
shows instead of the page breaking.

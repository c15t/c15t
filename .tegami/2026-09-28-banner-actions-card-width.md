---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Lay out banner actions by card width

The banner footer switches layout on the card's width instead of the
viewport's, so `--consent-banner-max-width` works on wide screens. Below 22rem,
Reject and Accept share a row with Customize below, instead of overflowing.
The default 440px card keeps its single row. The 20rem `widget` chip always
uses the two-row footer.

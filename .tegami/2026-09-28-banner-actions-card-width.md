---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Lay out banner actions by card width

The banner footer now switches layout on the card's width instead of the viewport's, so `--consent-banner-max-width` works on wide screens. A card narrower than 22rem puts Reject and Accept on one row and Customize on a full-width row below, where the buttons used to overflow the card. The default 440px card keeps its single row.

The `widget` chip is 20rem wide by default, so it now uses the same two-row footer on every screen size.

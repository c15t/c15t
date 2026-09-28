---
packages:
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Add a Pinterest Tag integration

`pinterestTag()` from `@c15t/scripts/pinterest-tag` recreates Pinterest's base code and loads `core.js` after marketing permission. On revocation it keeps the tag and calls `pintrk('setconsent', false)`, which stops events and clears Pinterest's first-party cookies; a later grant calls `setconsent(true)`. `pinterestTagEvent()` sends typed events for Pinterest's 20 event types and user-defined names. The CLI offers Pinterest Tag in its integration picker.

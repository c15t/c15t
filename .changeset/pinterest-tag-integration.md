---
'@c15t/scripts': minor
'@c15t/cli': patch
---

Add a Pinterest Tag integration. `pinterestTag()` from `@c15t/scripts/pinterest-tag` recreates Pinterest's v3 base code (the `pintrk` queue stub, `load`, `setconsent`, and `page`), loads `core.js` behind marketing consent, and keeps the script loaded after revocation so `pintrk('setconsent', false)` can stop tracking and clear Pinterest's first-party cookies. `pinterestTagEvent()` provides typed standard and custom event tracking. The CLI `generate` command now offers Pinterest Tag as a script snippet.

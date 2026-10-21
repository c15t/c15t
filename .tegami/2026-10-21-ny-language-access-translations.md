---
packages:
  "@c15t/translations": minor
  "@c15t/core": patch
  "@c15t/schema": patch
---

### Add Arabic, Bangla, Haitian Creole, Korean, Russian, Urdu and Yiddish

`@c15t/translations` now ships consent copy for `ar`, `bn`, `ht`, `ko`,
`ru`, `ur` and `yi`. Along with the existing Spanish, Chinese, Italian,
Polish and French, that covers the 12 languages New York State's language
access law names for state agencies.

Import one with `@c15t/translations/<code>`, or load them all with
`@c15t/translations/all`. `manifest()` loads them on demand like the other
languages, and the backend serves them from `/init`.

Arabic, Urdu and Yiddish render right to left.

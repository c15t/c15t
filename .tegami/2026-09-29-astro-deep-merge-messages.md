---
packages:
  '@c15t/astro': patch
---

### Deep-merge `i18n.messages` in Astro

`i18n.messages` now merges each translation group key by key, as the other adapters do. Overriding `common.acceptAll` alone used to replace the whole `common` group, so every other button label rendered empty.

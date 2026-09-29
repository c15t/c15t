---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Load new copy when the Vue consent language changes

Assigning a new language to `useConsentLanguage()` now runs init again, so the banner and dialog switch to that language without a separate `commands.init()` call. Assigning the current language does nothing. The Nuxt `ConsentRoot` now takes the same `language` prop as the Vue `ConsentRoot`.

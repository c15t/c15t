---
packages:
  "@c15t/core": minor
  "@c15t/react": minor
  "@c15t/svelte": minor
  "@c15t/vue": minor
  "@c15t/browser": minor
  c15t: minor
---

### Export banner copy and button labels for headless UIs

`resolvePromptCopy(translations, prompt)` returns the banner's title and
description, and reads the notice copy when the prompt is a notice.
`resolveActionLabels(translations)` labels each banner action, and
`resolvePreferenceControlLabels(translations)` labels the opt-out and
preferences buttons. All three use the active language and fall back to
English for a missing key. Import them from `c15t`, `@c15t/svelte`,
`@c15t/svelte/headless`, `c15t/vue` or `@c15t/browser/headless`.
`@c15t/browser/headless` also exports `resolveConsentPresentation` now.

React adds `useBannerCopy()` and `useConsentLabels()` to
`c15t/react/headless`, `c15t/next/headless` and
`c15t/tanstack-start/headless`. They return the same strings the stock
banner renders and update when the language changes. The same headless
entries now export `vendorsListedUnder`, which picks the declared vendors the
stock dialog lists under a category.

When a notice offers only a dismiss button, `primaryActions` from
`resolveConsentPresentation` now contains `dismiss`, so a headless banner can
style it as the primary button. The browser banner now styles that button as
primary too. The React, Vue and Svelte banners already did.

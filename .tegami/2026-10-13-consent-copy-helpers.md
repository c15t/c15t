---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Export banner copy and button labels for headless UIs

`resolvePromptCopy(translations, prompt)` returns the banner's title and
description, and reads the notice copy when the prompt is a notice.
`resolveActionLabels(translations)` labels each banner action, and
`resolvePreferenceControlLabels(translations)` labels the opt-out and
preferences buttons. All three use the active language and fall back to
English for a missing key. Import them from `c15t`, `@c15t/svelte`,
`@c15t/svelte/headless`, `c15t/vue/vue-plugin` or `@c15t/browser/headless`.
`@c15t/browser/headless` also exports `resolveConsentPresentation` now.

React adds `useBannerCopy()` and `useConsentLabels()` to
`c15t/react/headless`, `c15t/next/headless` and
`c15t/tanstack-start/headless`. They return the same strings the stock
banner renders and update when the language changes. The same headless
entries now export `useVendorsListedUnder(category)`, which returns the
vendors the stock dialog lists under a category.

When a notice offers only a dismiss button, `primaryActions` from
`resolveConsentPresentation` now contains `dismiss`, so a headless banner can
style it as the primary button. The browser banner now styles that button as
primary too. The React, Vue and Svelte banners already did.

---
packages:
  "@c15t/nextjs": minor
  "@c15t/react": minor
  "@c15t/tanstack-start": minor
  c15t: minor
---

### Match the stock surfaces' text direction and IAB handling in headless UI

`useConsentTextDirection()` returns `'rtl'` or `'ltr'` for the language
c15t shows consent copy in. Set it as `dir` on a custom banner or
preference center, as the stock ones do, so a visitor whose browser
language runs right to left gets a mirrored layout.

`useIABPolicyGuard()` is now public. A custom surface that handles only
opt-in and opt-out calls it and returns `null` when `useModel()` is
`'iab'`. The guard throws `IABUnavailableError` while rendering when the
policy needs IAB and the app never loaded `<IABProvider>`.

Import both from `c15t/react/headless`, `c15t/next/headless` or
`c15t/tanstack-start/headless`.

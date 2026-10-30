---
packages:
  "@c15t/core": patch
  "@c15t/iab": patch
  "@c15t/schema": patch
---

### Consent provider no longer needs `structuredClone`

`ConsentProvider` threw `structuredClone is not defined` on mount in browsers
without that global: Chrome and Android WebView before 98, Firefox before 94,
Safari and iOS Safari before 15.4, and Samsung Internet before 18. Declaring
vendors, building the Europe and Quebec policy presets, and answering
`__tcfapi` and `__gpp` calls now copy their data without it, as 2.x did. You
can remove a `structuredClone` polyfill you added only for c15t.

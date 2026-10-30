---
packages:
  "@c15t/browser": patch
  "@c15t/core": patch
  "@c15t/dev-tools": patch
  "@c15t/iab": patch
  "@c15t/integrations": patch
  "@c15t/schema": patch
  "@c15t/svelte": patch
  "@c15t/translations": patch
  "@c15t/ui": patch
  "@c15t/vue": patch
---

### Consent provider works again in browsers before Safari 15.4

Since 3.0, the consent provider has used `structuredClone`, `Object.hasOwn`,
`Array.prototype.at` and `Array.prototype.findLast`. Safari 15.4 was the first
Safari to ship them, and Chrome added them between 92 and 98. Without them, the
provider failed to mount or the banner did not render: Chrome and Android
WebView before 98, Firefox before 104, Safari and iOS Safari before 15.4, and
Samsung Internet before 18.

c15t no longer calls these built-ins in browser code. You can remove a polyfill
you added only for c15t.

---
packages:
  'c15t': minor
  '@c15t/core': minor
  '@c15t/react': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/astro': minor
  '@c15t/browser': minor
---

### An undeclared vendor reads as not allowed

Breaking change: reading vendor consent for an id that no `vendors` entry, script slug or backend vendor list declares now returns `false`. Before, React's `useVendorAllowed`, Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` returned `true` for such an id without checking any category, so a typo or a missing declaration read as allowed before the visitor consented. In development, c15t logs one warning per undeclared id that names the missing declaration. Declare every vendor you read, for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The rule lives in one helper, `isVendorAllowed(snapshot, vendorId, now?)`, exported from `c15t` and `@c15t/core`. A declared vendor keeps its behaviour: it is allowed when its category condition passes and, outside an IAB policy, the visitor has not switched it off.

Vue gains `useVendorAllowed(vendorId)`, which returns a computed boolean and is auto-imported in Nuxt. The Svelte consent manager from `getConsentManager()` gains `isVendorAllowed(vendorId)`.

Scripts, iframes and network rules that carry an undeclared `vendor` slug are gated as before: they follow their category.

---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### An undeclared vendor reads as not allowed

Breaking. Reading vendor consent for an id that no `vendors` entry, script slug
or backend vendor list declares returns `false`. React's `useVendorAllowed`,
Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` used to
return `true`, so a typo read as allowed before the visitor consented. In
development, c15t warns once per undeclared id. Declare every vendor you read,
for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The check is exported as `isVendorAllowed(snapshot, vendorId, now?)` from `c15t`
and `@c15t/core`. Vue adds `useVendorAllowed(vendorId)`, auto-imported in Nuxt,
and the Svelte manager from `getConsentManager()` adds
`isVendorAllowed(vendorId)`.

Scripts, iframes and network rules with an undeclared `vendor` slug still follow
their category.

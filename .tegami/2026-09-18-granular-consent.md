---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/integrations":
    replay:
      - exit-prerelease(npm:@c15t/integrations)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/translations":
    replay:
      - exit-prerelease(npm:@c15t/translations)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors
with the `vendors` option or the backend manifest, then name them with `vendor`
on scripts and network rules and `data-vendor` on iframes. A target loads when
its category passes and its vendor is not off.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte
show a switch per vendor. React adds `useVendorDraft`, `useVendorAllowed`,
`useDeclaredVendors` and `useVendorChoice`, and `useConsentDraft` gains
`vendors` and `setVendor`. The Svelte manager state gains `selectedVendors` and
`setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and
reach the backend as `vendorChoice`. Run the migrator before deploying, since
migration `4-vendor-choice` adds the column. A denial does not delete cookies
the vendor already set.

This release also fixes unstyled switches and category rows in the Vue
preference center under Nuxt.

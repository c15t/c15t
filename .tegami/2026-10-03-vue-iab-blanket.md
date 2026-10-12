---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Vue IAB "Reject all" no longer consents to Purpose 1

"Reject all" on the Vue and Nuxt IAB banner and dialog, and
`useConsentIabSave()('none')`, recorded consent to Purpose 1 in the saved TC
string. "Accept all" and "Reject all" now call the IAB CMP's `acceptAll()` and
`rejectAll()`, as React and Svelte do, and record a choice for every vendor.
With no IAB CMP mounted, `'all'` and `'none'` record nothing.

Breaking. `buildAcceptAllIab()` and `buildRejectAllIab()` are no longer exported
from `@c15t/vue/vue-plugin`, `#c15t/composables`,
`@c15t/vue/composables/iabSelection`, `c15t/vue/vue-plugin` or
`c15t/vue/composables/iabSelection`. Call `useConsentIabSave()` with `'all'` or
`'none'` instead.

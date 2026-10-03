---
packages:
  "@c15t/vue": major
  c15t: major
---

### Vue IAB "Reject all" no longer consents to Purpose 1

"Reject all" on the Vue and Nuxt IAB banner and dialog, and `useConsentIabSave()('none')`, recorded consent to Purpose 1 (store and access information on a device) and encoded it in the saved TC string. "Accept all" and "Reject all" now use the IAB CMP's own `acceptAll()` and `rejectAll()`, which React and Svelte already call. Reject all refuses every purpose, and both actions now record a choice for every vendor, including vendors and custom vendors that declare no consent or no legitimate-interest purposes, so the TC string discloses the same vendors as other frameworks. With no IAB CMP mounted (no valid `cmpId`, or `consentSource` is set), `'all'` and `'none'` now record nothing, as in React and Svelte, instead of saving without a TC string.

**Breaking.** `buildAcceptAllIab()` and `buildRejectAllIab()` are no longer exported from `@c15t/vue/vue-plugin`, `#c15t/composables`, `@c15t/vue/composables/iabSelection`, or the matching `c15t/vue/vue-plugin` and `c15t/vue/composables/iabSelection` entries. Call `useConsentIabSave()` with `'all'` or `'none'` instead.

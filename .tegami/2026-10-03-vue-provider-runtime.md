---
packages:
  "@c15t/vue": minor
  "c15t": minor
  "@c15t/core": patch
---

### Vue and Nuxt on the shared runtime

The `c15tVue` plugin and the Nuxt module now build their consent runtime with
`createConsentProviderRuntime` from `@c15t/core`, the runtime React and Svelte
use, instead of their own copy. Plugin options, module options, composables
and components keep their names and shapes.

New: the `iab` option sets IAB TCF publisher settings for the CMP Vue mounts
under an `iab` policy, such as `publisherRestrictions` and
`publisherCountryCode`. Vue apps had no way to set restrictions before, and
mounting the CMP reset them to none. Fields left out still come from `/init`,
and `iab: false` mounts no CMP.

Behaviour that changes:

- On a Nuxt page with `ssr: false`, the plugin starts the runtime before the
  app mounts, so `/init` runs while the app mounts instead of after it.
- Clearing records before the runtime starts, or without browser storage, now
  also clears the vendor choice.
- Experiment arms are checked against your `theme`, so an arm that is only
  balanced together with your theme's `consentActions` is no longer rejected.
- A `Sec-GPC` signal from the request stays active when the browser reports
  `navigator.globalPrivacyControl === false`, as in every other adapter.
  Vue used to switch it off.
- The script loader, network blocker, data clearing and a `consentSource`
  connection load as separate chunks, only for apps that configure them.
  Matching requests stay held until the network blocker loads, and optional
  categories stay denied until a `consentSource` connects.
- Changes to the Nuxt `c15t` app config while the page runs, such as
  `updateAppConfig()`, now reach the runtime: scripts, network and iframe
  blocking, vendors, categories, callbacks and `reloadOnConsentRevoked` follow
  them.
- A plain Vue `prefetch` without a resolved policy no longer skips `/init`.

The object `useConsentKernelContext()` returns gains `runtime`, `start()`,
`setOverrides()` and `update()`.

**Breaking.** That object no longer has `initialRecords`
(`useConsentKernelContext` from `@c15t/vue/composables/kernel` and
`c15t/vue/composables/kernel`). Read the records from the snapshot instead:
`useConsentSnapshot().value` has `explicitChoice`, `subject`,
`noticeDismissal` and `vendorChoice` once storage or the prefetch has
hydrated the kernel.

`@c15t/core`: a runtime `prefetch` whose `initialRecords` names only a
subject, as an `/init` answer's `subjectId` does, no longer counts as records
the server read. Storage hydrates the kernel as it would without a prefetch,
so a stored choice applies, and the named subject stays unless storage holds
its own.

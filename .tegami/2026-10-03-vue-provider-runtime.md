---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Vue and Nuxt on the shared runtime

The `c15tVue` plugin and the Nuxt module build their consent runtime with
`createConsentProviderRuntime` from `@c15t/core`, as React and Svelte do.
Options, composables and components keep their names and shapes.

A new `iab` option sets IAB TCF publisher settings such as
`publisherRestrictions` and `publisherCountryCode`. Fields left out come from
`/init`, and `iab: false` mounts no CMP.

Behavior changes:

- With Nuxt `ssr: false`, `/init` runs while the app mounts instead of after it.
- A `Sec-GPC` request signal stays active when `navigator.globalPrivacyControl`
  is `false`, as in other adapters.
- The script loader, network blocker, data clearing and `consentSource` load as
  separate chunks. Optional categories stay denied until a `consentSource`
  connects.
- Changes to the Nuxt `c15t` app config at runtime, such as `updateAppConfig()`,
  reach the runtime.
- A plain Vue `prefetch` without a resolved policy no longer skips `/init`.

`useConsentKernelContext()` gains `runtime`, `start()`, `setOverrides()` and
`update()`.

In `@c15t/core`, a `prefetch` whose `initialRecords` names only a subject no
longer stops a stored choice from applying.

#### Breaking changes

`useConsentKernelContext()` no longer returns `initialRecords`. Read records
from `useConsentSnapshot().value` (`explicitChoice`, `subject`,
`noticeDismissal`, `vendorChoice`) once storage or the prefetch has hydrated the
kernel.

---
packages:
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Load runtime modules on demand as single chunks

`onDemandRuntimeModules` from the new `c15t/runtime/on-demand` entry
(`@c15t/core/runtime/on-demand`) loads the script loader, the network blocker,
data clearing and a `consentSource` connection only when a page configures them.
The script loader and network blocker share one chunk and the others get one
each, so Vite and esbuild no longer split shared consent code into extra files
fetched up front. Spread it into the modules you pass to
`createConsentProviderRuntime`. The Vue plugin and Nuxt module use it.

If the network blocker's chunk fails to load, requests its rules match are
blocked (a `451` response or a failed XHR) and the chunk is tried again when the
browser comes back online.

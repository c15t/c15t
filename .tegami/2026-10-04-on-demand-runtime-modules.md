---
packages:
  "@c15t/core": minor
---

### Load runtime modules on demand as single chunks

`onDemandRuntimeModules` from `c15t/runtime/provider` loads the script
loader, the network blocker, data clearing and a `consentSource` connection
only when a page configures them. Each loads as one chunk that imports
nothing the first chunk has, so Vite and esbuild no longer split shared
consent code into extra files that every page then fetches up front. Spread
it into the modules you pass to `createConsentProviderRuntime`. The Vue
plugin and Nuxt module use it.

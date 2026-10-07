---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
---

### Ship the script loader only to pages with scripts

Svelte, SvelteKit, Astro and the `@c15t/browser` npm entries load the script
loader and network blocker as one separate chunk, only on pages that set
`scripts` or blocker rules. Other pages ship about 4 KB less gzipped
JavaScript.

- In SvelteKit, add `c15tPreload()` from the new `@c15t/svelte/vite` entry to
  `vite.config.ts`. `c15tHandle` then preloads the chunk on pages whose
  provider has scripts or blocker rules. Without the plugin, scripts load one
  request after the app's JavaScript.
- In Astro, a site that configures `scripts`, a `clientEntrypoint` or
  `networkBlocker` rules keeps the code in its boot script. Other sites never
  download it.
- With the `@c15t/browser` npm package, the chunk loads when c15t starts. Your
  bundler names it, starting from
  `@c15t/core/dist/modules/loader-and-blocker.js`. Add a `modulepreload` with
  `fetchpriority="low"` if returning visitors' scripts must start sooner. The
  script-tag builds are unchanged.

`@c15t/core/runtime/on-demand` exports `createConsentRuntimeWith(options,
modules)` and `mountRuntimeIAB`. The new
`@c15t/core/runtime/on-demand-factories` entry
(`c15t/runtime/on-demand-factories`) exports `scriptLoaderOnDemand`,
`networkBlockerOnDemand`, `clearOnRevocationOnDemand` and
`connectConsentSourceOnDemand`.

**Breaking.** `boot()` from `@c15t/astro/client`, called without the
integration, no longer mounts a script loader, network blocker or
`consentSource` connection. It throws if its options include `scripts`,
`networkBlocker` or `consentSource`. Add the `c15t()` integration to
`astro.config`, or leave those options out of a standalone `boot()`.

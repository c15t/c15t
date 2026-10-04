---
packages:
  "@c15t/svelte": minor
  "@c15t/astro": minor
  "@c15t/browser": minor
  "@c15t/core": minor
---

### Ship the script loader only to pages with scripts

Svelte, SvelteKit, Astro and the `@c15t/browser` npm entries now load the script loader as a separate chunk, only when `scripts` is not empty. A page without scripts or network blocker rules ships about 4 KB of gzipped JavaScript less.

Pages that do configure them still get the code without an extra request:

- **SvelteKit:** add `c15tPreload()` from the new `@c15t/svelte/vite` entry to `vite.config.ts`. `c15tHandle` then adds `<link rel="modulepreload" fetchpriority="low">` for the script loader (and for the network blocker when the provider has rules) to every page whose provider configures them, prerendered pages included. Low priority lets the app's own chunks go first; the runtime needs these only after hydration. The link carries the provider's `nonce`, else the nonce SvelteKit put on its own scripts. Without the plugin, scripts load one request after the app's JavaScript.
- **Astro:** a site that configures `scripts` (or a `clientEntrypoint`, which may add some) keeps the script loader in its boot script; `networkBlocker` rules in the integration options do the same for the blocker. A site with neither never downloads them.
- **`@c15t/browser`:** the script-tag builds (`c15t.js` and friends) are unchanged. With the npm package, the chunk loads when c15t starts; your bundler names it, so add your own `modulepreload` with `fetchpriority="low"` for it if returning visitors' scripts must start sooner.

`@c15t/core/runtime/provider` exports `createConsentRuntimeWith(options, modules)`, a configure-once runtime that mounts the module factories you choose, and `mountRuntimeIAB`. It also exports each on-demand factory on its own (`scriptLoaderOnDemand`, `networkBlockerOnDemand`, `clearOnRevocationOnDemand`, `connectConsentSourceOnDemand`), for a host that imports some modules statically and loads the rest on demand. Astro uses them, so a site with `scripts` keeps the script loader in its boot chunk instead of a chunk of its own.

**Breaking.** `boot()` from `@c15t/astro/client`, called without the integration, no longer mounts a script loader, network blocker or `consentSource` connection itself; the integration's page script registers them. Called on its own with `scripts`, `networkBlocker` or `consentSource` in its options, it throws. Add the `c15t()` integration to `astro.config` for those pages, or leave those options out of a standalone `boot()`.

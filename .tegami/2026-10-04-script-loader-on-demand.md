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

The script loader and the network blocker share one chunk, so a page with scripts and blocker rules fetches one file, and a returning visitor's held requests are decided when their scripts start. A page with only one of them downloads both.

- **SvelteKit:** add `c15tPreload()` from the new `@c15t/svelte/vite` entry to `vite.config.ts`. `c15tHandle` then adds one `<link rel="modulepreload" fetchpriority="low">` for that chunk to every page whose provider has scripts or blocker rules, prerendered pages included. Low priority lets the app's own chunks go first; the runtime needs the chunk only after hydration. The link carries the provider's `nonce`, else the nonce SvelteKit put on its own scripts. Without the plugin, scripts load one request after the app's JavaScript.
- **Astro:** a site that configures `scripts` (or a `clientEntrypoint`, which may add some) keeps the script loader in its boot script; `networkBlocker` rules in the integration options do the same for the blocker. A site with neither never downloads them.
- **`@c15t/browser`:** the script-tag builds (`c15t.js` and friends) are unchanged. With the npm package, the chunk loads when c15t starts; your bundler names it (it starts from `@c15t/core/dist/modules/loader-and-blocker.js`), so add your own `modulepreload` with `fetchpriority="low"` for it if returning visitors' scripts must start sooner.

`@c15t/core/runtime/on-demand` exports `createConsentRuntimeWith(options, modules)`, a configure-once runtime that mounts the module factories you choose, and `mountRuntimeIAB`, next to `onDemandRuntimeModules`. It is separate from `@c15t/core/runtime/provider`, so a provider that loads modules through its own `import()` calls gets no unused chunks from it under esbuild, and a page that configures once gets none of the provider runtime's. The new `@c15t/core/runtime/on-demand-factories` entry (`c15t/runtime/on-demand-factories`) exports each on-demand factory on its own (`scriptLoaderOnDemand`, `networkBlockerOnDemand`, `clearOnRevocationOnDemand`, `connectConsentSourceOnDemand`), for a host that imports some modules statically and loads the rest on demand; the first two each load a chunk with only their module. Astro uses them, so a site with `scripts` keeps the script loader in its boot chunk instead of a chunk of its own.

**Breaking.** `boot()` from `@c15t/astro/client`, called without the integration, no longer mounts a script loader, network blocker or `consentSource` connection itself; the integration's page script registers them. Called on its own with `scripts`, `networkBlocker` or `consentSource` in its options, it throws. Add the `c15t()` integration to `astro.config` for those pages, or leave those options out of a standalone `boot()`.

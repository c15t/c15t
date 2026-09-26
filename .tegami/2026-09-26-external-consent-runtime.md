---
packages:
  'c15t': minor
  '@c15t/core': minor
  '@c15t/astro': minor
  '@c15t/scripts': minor
  '@c15t/react': minor
  '@c15t/vue': minor
  '@c15t/svelte': minor
  '@c15t/browser': minor
  '@c15t/dev-tools': patch
---

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and add optional reload handling for withdrawal. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

---
'@c15t/astro': minor
'@c15t/vue': patch
---

`@c15t/astro` can render its dialogs with React or Vue instead of Svelte.

A site that already ships React or Vue should reuse that runtime for the
consent dialog rather than downloading Svelte alongside it. Set `ui: 'react'`
or `ui: 'vue'` and install the matching Astro integration; `'svelte'` stays
the default because it is the smallest of the three.

The choice is never inferred. Reading it off whichever integration happens to
be installed would change what every visitor downloads without anyone asking
for it, so an installed `@astrojs/react` or `@astrojs/vue` gets a one-line
suggestion at build time and nothing more. `astro:config:done` fails with the
list of packages to install when the selected `ui` has no matching Astro
integration.

Only the selected framework reaches the build. The adapter registry ships
empty and the integration writes the one adapter and the one island specifier
into the page script it injects, both behind `import()`, so a Svelte site's
build never resolves `@c15t/react` or `vue` and a React site's never resolves
Svelte. Measured on `examples/astro-demo`, the on-demand dialog graph is 74.6
KB gzipped for `svelte`, 115.7 KB for `react` and 139.7 KB for `vue`, and each
build contains exactly one framework runtime.

`react`, `react-dom`, `vue`, `@c15t/react` and `@c15t/vue` are optional peer
dependencies. `requireSvelte` is now `requireUIIntegration`, which checks
whichever framework `ui` names.

`@c15t/vue`'s Vite plugin now answers `#c15t/composables` from `resolveId` as
well as `resolve.alias`. A host that declares its own aliases in array form —
Astro does — replaced the object the plugin contributed instead of merging
with it, and the specifier reached Rollup unresolved.

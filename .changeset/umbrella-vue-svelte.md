---
'c15t': minor
'@c15t/vue': minor
'@c15t/svelte': minor
---

The `c15t` umbrella package now covers Vue/Nuxt and Svelte.

- **`c15t`**: installing `c15t` additionally brings in `@c15t/vue` and `@c15t/svelte` (pinned to exact matching versions) and mirrors every one of their exports one-to-one: register `c15t/vue` as your Nuxt module (or use the `c15t/vue/vue-plugin` Vue plugin), and import `c15t/svelte` for the Svelte components (`c15t/svelte/headless`, `c15t/svelte/server`, and the `c15t/svelte/styles.css` entrypoints included). The `@c15t/vue` wildcard subpaths mirror too: `c15t/vue/composables/*` ≡ `@c15t/vue/composables/*` and `c15t/vue/runtime/*` ≡ `@c15t/vue/runtime/*`.
- **`@c15t/vue`**: now published — the full Nuxt module and plain-Vue integration previously only available inside the repo. Install it directly or through the umbrella. The Nuxt module now registers its runtime directory (resolved and real path) for transpilation/inlining, so server handlers keep working when the package is reached through an aliasing package or a symlinking package manager.

Framework peers follow the umbrella's optional-peer convention: `@c15t/vue` now declares `vue` as an optional peer dependency instead of a hard dependency (so your app's Vue instance is always the only one), and `@c15t/svelte` marks its `svelte` peer optional — package managers no longer force-install a framework you are not using when the umbrella pulls these packages in.

The scoped packages remain published and permanently supported; `@c15t/vue` and `@c15t/svelte` keep working when installed directly.

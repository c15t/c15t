---
'c15t': minor
'@c15t/vue': minor
---

The `c15t` umbrella package now covers Vue/Nuxt.

- **`c15t`**: installing `c15t` additionally brings in `@c15t/vue` (pinned to the exact matching version) and mirrors every one of its exports one-to-one: register `c15t/vue` as your Nuxt module (or use the `c15t/vue/vue-plugin` Vue plugin). The wildcard subpaths mirror too: `c15t/vue/composables/*` ≡ `@c15t/vue/composables/*` and `c15t/vue/runtime/*` ≡ `@c15t/vue/runtime/*`.
- **`@c15t/vue`**: now published — the full Nuxt module and plain-Vue integration previously only available inside the repo. Install it directly or through the umbrella. The Nuxt module now registers its runtime directory (resolved and real path) for transpilation/inlining, so server handlers keep working when the package is reached through an aliasing package or a symlinking package manager.

The framework peer follows the umbrella's optional-peer convention: `@c15t/vue` now declares `vue` as an optional peer dependency instead of a hard dependency (so your app's Vue instance is always the only one) — package managers no longer force-install a framework you are not using when the umbrella pulls the package in.

The scoped package remains published and permanently supported; `@c15t/vue` keeps working when installed directly.

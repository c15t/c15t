---
'@c15t/vue': patch
'@c15t/cli': patch
---

Review fixes ahead of the first `@c15t/vue` publish, and safer CLI reruns.

- **`@c15t/vue`**: the published tarball is now self-contained — `schema/nuxt.schema.d.ts` points at the built declarations instead of the excluded `src/` tree, and the `@vueuse/core` dependency is gone (replaced by local composables), so its required `vue` peer no longer forces Vue into projects that installed the `c15t` umbrella for a different framework.
- **`@c15t/cli`**: rerunning setup in an app that already depends on `@c15t/react` or `@c15t/nextjs` now retains that install style — the CLI no longer adds the `c15t` umbrella alongside a scoped install, and stylesheet normalization to umbrella paths only applies when the umbrella is actually installed.

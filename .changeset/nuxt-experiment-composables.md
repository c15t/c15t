---
"@c15t/vue": patch
---

Nuxt auto-imports `useExperiment()` and `useResolvedPresentation()`, so a page can read the assigned banner-experiment arm without importing from `c15t/vue/vue-plugin`.

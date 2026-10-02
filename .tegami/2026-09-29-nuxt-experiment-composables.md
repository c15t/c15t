---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Auto-import the experiment composables in Nuxt

Nuxt auto-imports `useExperiment()` and `useResolvedPresentation()`, so a page can read the assigned banner-experiment arm without importing from `c15t/vue/vue-plugin`.

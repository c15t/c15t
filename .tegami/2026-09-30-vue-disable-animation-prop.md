---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Accept `disableAnimation` on the Vue banners and dialogs

`consent-banner.vue`, `consent-manager.vue` and the IAB banner and dialog take a `disableAnimation` prop that overrides the config's `disableAnimation` for that surface, as the React components do. Left unset, they follow the config.

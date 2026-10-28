---
packages:
  '@c15t/vue': patch
---

### Connect the consent panel in Nuxt DevTools popup windows

Let the c15t tab find the app's consent provider through a popup opener or
past a cross-origin DevTools frame. This keeps the panel connected to the
app's consent state in Nuxt DevTools 4 while preserving Nuxt 3 and 4 support.

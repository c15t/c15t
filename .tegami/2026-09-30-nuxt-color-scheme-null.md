---
packages:
  '@c15t/vue': patch
---

### Keep `colorScheme: null` in Nuxt

`colorScheme: null` under the `c15t` key of `nuxt.config.ts` or in `app.config.ts` now leaves the `c15t-dark` class on `<html>` to the site, as it does in Vue, React and Svelte. Nuxt merges options in a way that drops `null`, so it used to behave like an unset `colorScheme` and copy a `dark` class. A `null` passed as inline module options (`modules: [['@c15t/vue', { colorScheme: null }]]`) is still dropped by Nuxt before the module sees it; set it under the `c15t` key instead.

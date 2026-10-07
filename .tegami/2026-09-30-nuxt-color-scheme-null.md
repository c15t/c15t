---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Keep `colorScheme: null` in Nuxt

`colorScheme: null` under the `c15t` key of `nuxt.config.ts` or in
`app.config.ts` leaves the `c15t-dark` class on `<html>` to the site, as in Vue,
React and Svelte. Nuxt used to drop the `null`, so it acted like an unset
`colorScheme`. Nuxt still drops `null` in inline module options (`modules:
[['@c15t/vue', { colorScheme: null }]]`), so set it under the `c15t` key.

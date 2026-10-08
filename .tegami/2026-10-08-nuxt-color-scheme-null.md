---
packages:
  '@c15t/vue': patch
---

### Respect `colorScheme: null` in built Nuxt apps

`colorScheme: null` under the `c15t` key in `nuxt.config.ts` leaves
`c15t-dark` to your site. That held in tests but not in built apps: Nitro
replaces every `null` in runtime config with an empty string during the build,
and c15t read the empty string as unset. It then copied the site's `dark` class
into `c15t-dark`, removing a `c15t-dark` the site had set itself. The module
now reads the empty string as `null`.

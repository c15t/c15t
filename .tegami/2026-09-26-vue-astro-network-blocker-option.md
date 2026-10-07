---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Accept `networkBlocker` in the Vue plugin, Nuxt module and Astro integration

`C15tVuePluginOptions` includes `networkBlocker`, `iframeBlocker`, `scripts`,
`storageConfig` and `nonce`, so passing them is no longer a type error.
`@c15t/vue/vue-plugin` exports `RuntimeConsentConfig` and
`UseNetworkBlockerOptions`.

The Nuxt module accepts `networkBlocker` under `c15t` in `nuxt.config.ts`,
without `onRequestBlocked`. The Astro integration, which ignored network
blocking, takes `networkBlocker` in its options, and in the client extension
when you need `onRequestBlocked`.

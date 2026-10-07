---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Inspect consent from a c15t tab in Nuxt DevTools

In development, the Nuxt module adds a c15t tab to Nuxt DevTools with the panels
for the app's consent kernel. Production builds don't register it. Set
`devtools: false` in the module options to turn it off.

`c15t/vue/devtools` and `@c15t/vue/devtools` export `ConsentDevToolsPanel`,
which fills its parent element instead of floating over the page.
`createDevTools` accepts `embedded: true` for the same layout. Embedded panels,
including the TanStack Devtools plugin from `c15t/react/devtools`, drop their
own c15t header.

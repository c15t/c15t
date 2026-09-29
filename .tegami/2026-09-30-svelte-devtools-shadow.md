---
packages:
  '@c15t/svelte': patch
  '@c15t/react': patch
  '@c15t/vue': patch
---

### Pass `shadow` from `ConsentDevTools` to the DevTools panel

`ConsentDevTools` in `@c15t/svelte`, `@c15t/react` and `@c15t/vue` accepted
`shadow` in its props type but never passed it to `createDevTools`, so the
panel always mounted inside a shadow root. The Vue component did not
declare the prop at all. `shadow={false}` now mounts the panel in the light
DOM, with its stylesheet in `<head>`, as the `@c15t/dev-tools` option
describes. Leaving `shadow` out keeps the shadow root.

---
packages:
  '@c15t/svelte': patch
---

### Pass `shadow` from `ConsentDevTools` to the DevTools panel

`ConsentDevTools` accepted `shadow` in its props type but never passed it to
`createDevTools`, so the panel always mounted inside a shadow root.
`shadow={false}` now mounts it in the light DOM, with its stylesheet in
`<head>`, as the `@c15t/dev-tools` option describes.

---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Pass `shadow` from `ConsentDevTools` to the DevTools panel

`ConsentDevTools` in `@c15t/svelte`, `@c15t/react` and `@c15t/vue` ignored its
`shadow` prop, and the Vue component did not declare it. `shadow={false}` mounts
the panel in the light DOM with its stylesheet in `<head>`. Leaving `shadow` out
keeps the shadow root.

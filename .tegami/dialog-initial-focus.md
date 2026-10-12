---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Open the preference dialog with focus on its first control

The consent dialog and the IAB dialog focus the first tabbable control on open
instead of their container, so keyboard users see the focus ring on a control
rather than around the whole card. Screen readers still announce the title and
description. Blocking banners keep focusing their container. `setupFocusTrap` in
`@c15t/ui` takes an `initialFocus` option, and the React hook, Svelte action and
Vue composable pass it through.

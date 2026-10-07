---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Open the preference dialog without animation when `disableAnimation` is set

The Svelte and script-tag preference dialogs no longer fade and scale in when
`disableAnimation` is on. Their overlay and panel carry
`data-disable-animation`, as the Vue dialog does.

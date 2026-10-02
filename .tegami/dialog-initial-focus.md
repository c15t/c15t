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

The consent dialog and the IAB dialog used to focus their own container on
open and draw a focus ring around the whole card for keyboard users. They now
focus the first tabbable control inside the panel, the way dialog libraries
such as Base UI do, so the ring lands on a control. Screen readers still
announce the title and description as focus enters, through the panel's
`aria-labelledby` and `aria-describedby`. Blocking banners keep focusing
their container so no action button is favored. `setupFocusTrap` in
`@c15t/ui` takes an `initialFocus` option, and the React hook, Svelte action
and Vue composable pass it through.

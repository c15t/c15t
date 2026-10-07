---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Mirror a `.dark` class when `colorScheme` is unset in Svelte

`ConsentManagerProvider` with no `colorScheme` copies a `dark` class on
`<html>` into `c15t-dark` and follows its changes, as the React and Vue
providers do. Pass `colorScheme: null` to keep managing `c15t-dark` yourself.

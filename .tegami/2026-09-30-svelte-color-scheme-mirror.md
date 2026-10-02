---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Mirror a `.dark` class when `colorScheme` is unset in Svelte

`ConsentManagerProvider` with no `colorScheme` now copies a `dark` class on `<html>` into `c15t-dark` and follows it as it changes, as the React and Vue providers do. Before, an unset `colorScheme` left `c15t-dark` alone, so a site theme switch that toggled `dark` never reached the consent UI. Pass `colorScheme: null` to keep managing `c15t-dark` yourself.

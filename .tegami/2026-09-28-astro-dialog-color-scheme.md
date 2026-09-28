---
packages:
  '@c15t/astro': minor
  '@c15t/react': patch
  '@c15t/ui': patch
---

### Keep the Astro color scheme when a dialog opens

With `colorScheme: 'dark'` or `'system'`, opening the preference dialog with `ui: 'react'` removed `c15t-dark` from `<html>` unless the page also had a `dark` class, so the banner and dialog turned light. The dialog islands now leave the class to the page's colour-scheme setting. The provider option types in `@c15t/react` and `@c15t/ui` now accept `colorScheme: null`, which the providers already treated as "leave the class alone".

Set `colorScheme: 'none'` when your site's own theme switch sets `c15t-dark`. c15t then emits no colour-scheme script and never adds or removes the class, on boot, after ClientRouter navigations or when a dialog opens.

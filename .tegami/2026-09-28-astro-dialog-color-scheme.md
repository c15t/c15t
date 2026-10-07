---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Keep the Astro color scheme when a dialog opens

With `colorScheme: 'dark'` or `'system'`, opening the preference dialog with
`ui: 'react'` removed `c15t-dark` from `<html>` and turned the banner and dialog
light. The dialog islands leave the class alone. The `@c15t/react` and
`@c15t/ui` provider types accept `colorScheme: null`, which means the same.

If your site's own theme switch sets `c15t-dark`, set `colorScheme: 'none'` and
c15t never adds or removes the class.

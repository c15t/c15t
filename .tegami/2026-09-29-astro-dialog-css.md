---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Export the Astro dialog stylesheets

With `styles: false`, import the preference dialog's rules from
`@c15t/astro/dialog.css` (`c15t/astro/dialog.css` in the umbrella package).
The Svelte dialog also needs `@c15t/astro/primitives.css`. You no longer need
to install `@c15t/ui` for these.

```css
@import 'c15t/astro/styles.css';
@import 'c15t/astro/dialog.css';
@import 'c15t/astro/primitives.css';
```

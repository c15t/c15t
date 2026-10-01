---
packages:
  '@c15t/astro': patch
  'c15t': patch
---

### Export the Astro dialog stylesheets

With `styles: false`, import the preference dialog's rules from `@c15t/astro/dialog.css` (`c15t/astro/dialog.css` in the umbrella package). The Svelte dialog also needs `@c15t/astro/primitives.css` (`c15t/astro/primitives.css`). You no longer need to install `@c15t/ui` to import `@c15t/ui/styles/dialog.css` and `@c15t/ui/styles/primitives.css`.

```css
@import 'c15t/astro/styles.css';
@import 'c15t/astro/dialog.css';
@import 'c15t/astro/primitives.css';
```

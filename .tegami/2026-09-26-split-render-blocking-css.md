---
packages:
  c15t: major
  '@c15t/ui': major
  '@c15t/react': major
  '@c15t/nextjs': major
  '@c15t/tanstack-start': major
  '@c15t/svelte': patch
  '@c15t/astro': patch
  '@c15t/browser': patch
---

### Keep dialog CSS out of the render-blocking stylesheet

**Breaking.** `styles.css` now carries only what a first paint can show: the default tokens, every c15t CSS variable, and the rules for the banner, `ConsentDialogTrigger` and the `ConsentGate` placeholder. It shrinks from 125 KB to 66 KB (16.2 KB to 8.8 KB gzipped). The dialog and preference-widget rules moved to `@c15t/ui/styles/dialog.css`, which the dialog's module imports, so your bundler ships them with the dialog's lazy chunk and applies them before the dialog renders. In a Next.js production build the page's stylesheet drops from 18.2 KB to 10.6 KB gzipped.

- `@c15t/ui/styles.css` and `styles.tw3.css` no longer contain the dialog, preference widget, accordion, switch, tabs, collapsible, preference item or vendor list rules. React, Next.js and TanStack Start load them for you. If you render `@c15t/ui` class maps for those parts in your own components, import `@c15t/ui/styles/dialog.css`.
- The rules for the `@c15t/ui/styles/primitives` class maps moved to `@c15t/ui/styles/primitives.css`. The React components never used them. `c15t/svelte/styles.css` imports them; other hosts that render those class maps import the file themselves.
- `iab/styles.css` no longer repeats the default tokens and the shared rules. Import it after `styles.css`, as the IAB guides already say.
- Tailwind 3: the dialog stylesheet goes through your PostCSS pipeline, and Tailwind 3 rejects its `@layer components` block. Add `@c15t/ui/postcss-tailwind3` before `tailwindcss` in your PostCSS plugins. Without it the build fails with "`@layer components` is used but no matching `@tailwind components` directive is present".
- If you import `styles.css` into a named layer (`@import '…/styles.css' layer(c15t)`), the dialog rules still join the top-level `components` layer.

Svelte, Astro, Vue and the script-tag build render the same styles as before. `c15t/svelte/styles.css` still holds every rule, because Svelte loads its dialog with the page. Astro injects the banner rules; the React and Svelte dialog islands import the rest, which Astro links on every page, and with `ui: 'vue'` the integration injects them. If you set `styles: false` with `ui: 'vue'`, also import `@c15t/ui/styles/dialog.css`. `@c15t/browser` inlines the dialog rules as before.

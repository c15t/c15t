---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Keep dialog CSS out of the render-blocking stylesheet

**Breaking.** `styles.css` keeps only what a first paint shows: tokens, c15t
CSS variables, the banner, `ConsentDialogTrigger` and the `ConsentGate`
placeholder. It drops from 16.2 KB to 8.8 KB gzipped. Dialog and
preference-widget rules moved to `@c15t/ui/styles/dialog.css`, which loads
with the dialog's lazy chunk. React, Next.js and TanStack Start load it for
you.

- If your own components render `@c15t/ui` class maps for the dialog,
  preference widget, accordion, switch, tabs, collapsible, preference item or
  vendor list, import `@c15t/ui/styles/dialog.css`. In components that can
  run on the server, import the `@c15t/ui/styles/dialog` module instead.
- Rules for the `@c15t/ui/styles/primitives` class maps moved to
  `@c15t/ui/styles/primitives.css`. Import it if you render those class maps
  outside Svelte.
- `iab/styles.css` no longer repeats the default tokens and shared rules.
  Import it after `styles.css`.
- Tailwind 3: add `@c15t/ui/postcss-tailwind3` before `tailwindcss` in your
  PostCSS plugins, or the build fails with "`@layer components` is used but
  no matching `@tailwind components` directive is present".
- If you import `styles.css` into a named layer, the dialog rules still land
  in the top-level `components` layer.
- Astro with `ui: 'vue'` and `styles: false`: also import
  `@c15t/ui/styles/dialog.css`.

Svelte, Astro, Vue and the script-tag build render the same styles as before.

---
packages:
  '@c15t/ui': patch
  '@c15t/vue': patch
---

### Load each component stylesheet rule once

Apps that import `styles.css` no longer download component rules a second time. The `@c15t/ui/styles/components/<name>` class maps used to import their own CSS, so bundlers such as Next.js with Turbopack emitted extra stylesheets for the banner, actions, legal links and consent gate on first load, and for the dialog when it opened, all duplicating rules already in `styles.css`. Class maps now carry no CSS, and `styles.css` stays the single source for React, Next.js, TanStack Start, Svelte and Astro.

Vue components still include their styles: they now import the matching `@c15t/ui/styles/components/<name>.css` files directly, and Vue apps emit the same CSS as before.

If you imported `@c15t/ui/styles/components/<name>` class maps in your own components and relied on them to load CSS, import `styles.css` once, or import the matching `<name>.css` file.

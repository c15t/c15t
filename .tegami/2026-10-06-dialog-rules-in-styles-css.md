---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/astro': patch
  '@c15t/browser': patch
  c15t: patch
---

### Build Next.js Pages Router apps without `transpilePackages`

A Next.js app with only a `pages/` directory now builds with c15t's stock dialog. React's dialog modules used to import `@c15t/ui/styles/dialog.css`, and the Pages Router rejects global CSS that a dependency imports. With webpack, the default in Next.js 15 and `next build --webpack` in 16, the build failed with "Global CSS cannot be imported from within node_modules" unless the app set `transpilePackages`. With Turbopack, linked installs failed: workspaces, `npm link` and npm `file:` directories.

`styles.css` includes the preference dialog and widget rules again, and no `@c15t/react` or `@c15t/ui` module imports CSS. The app's one stylesheet import styles every stock surface, so opening the dialog loads no second stylesheet. The render-blocking stylesheet grows by about 4.5 kB gzip.

`@c15t/ui/styles/dialog.css`, the `@c15t/ui/styles/dialog` module and `c15t/astro/dialog.css` are now empty. They still resolve, so existing imports keep building; remove them. Svelte's `styles.css` and the Astro integration load the dialog rules through `styles.css`. Astro still links the primitives stylesheet for the Svelte dialog when it first opens.

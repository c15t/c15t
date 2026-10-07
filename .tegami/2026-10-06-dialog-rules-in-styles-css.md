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

A Next.js app with only a `pages/` directory builds with c15t's stock dialog.
Before, webpack builds failed with "Global CSS cannot be imported from within
node_modules" unless the app set `transpilePackages`, and Turbopack failed on
linked installs.

`styles.css` includes the preference dialog and widget rules again, and no
`@c15t/react` or `@c15t/ui` module imports CSS. The render-blocking stylesheet
grows by about 4.5 kB gzip.

`@c15t/ui/styles/dialog.css`, the `@c15t/ui/styles/dialog` module and
`c15t/astro/dialog.css` are now empty. They still resolve, so existing imports
keep building. Remove them.

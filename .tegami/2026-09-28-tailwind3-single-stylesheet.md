---
packages:
  '@c15t/ui': patch
  '@c15t/cli': patch
---

### Use `styles.css` with Tailwind 3

Tailwind 3 apps now import the same stylesheet as every other setup, such as `c15t/react/styles.css` or `c15t/next/styles.css`, and run `@c15t/ui/postcss-tailwind3` before `tailwindcss`. The plugin previously skipped the entry stylesheets, so Tailwind 3 apps had to pick `styles.tw3.css`, and the dialog stylesheet still needed the plugin. It now also flattens `styles.css` and `iab/styles.css`, handles c15t rules that Vite or `postcss-import` inline into your own stylesheet, and covers `@c15t/browser/styles.css` for light-DOM setups, where Tailwind 3 previously dropped the rules without an error and its preflight stripped the banner's button padding and borders.

```js title="postcss.config.mjs"
export default {
	plugins: {
		'@c15t/ui/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

Use the object form: Vite's PostCSS config loader rejects plugin names in an array.

Import the stylesheet above your `@tailwind` directives. `postcss-import` ignores an `@import` that follows other rules, so the previously documented position between `@tailwind components` and `@tailwind utilities` dropped the c15t rules in Vite apps. When the plugin is missing, Tailwind 3's build error now shows a comment naming it.

`c15t setup` now imports `styles.css` for Tailwind 3 and adds the plugin to your PostCSS config, replacing an existing `styles.tw3.css` import. Before this, it imported `styles.tw3.css` without the plugin, and the build failed on the dialog stylesheet. Setup also installs `@c15t/ui`, so pnpm can resolve the plugin. It edits the active plugin list, including `[name, options]` tuples, and ignores commented-out examples. If the config passes an imported `tailwindcss` binding or has no single plugin list to edit, if `package.json` holds the PostCSS config, or if several config files exist, setup prints the change to make instead of guessing which one your build reads. The v1 to v2 `add-stylesheet-imports` codemod keeps importing `styles.tw3.css`, because the plugin does not exist in v2.

`styles.tw3.css` and `iab/styles.tw3.css` still ship and work with the plugin.

---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Use `styles.css` with Tailwind 3

Tailwind 3 apps import the same stylesheet as every other setup, such as
`c15t/react/styles.css`, and run `@c15t/ui/postcss-tailwind3` before
`tailwindcss`. The plugin covers `styles.css`, `iab/styles.css` and
`@c15t/browser/styles.css`.

```js title="postcss.config.mjs"
export default {
	plugins: {
		'@c15t/ui/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

Use the object form, since Vite's PostCSS loader rejects plugin names in an
array. Import the stylesheet above your `@tailwind` directives. The previously
documented position between `@tailwind components` and `@tailwind utilities`
dropped the c15t rules in Vite apps.

`c15t setup` imports `styles.css` for Tailwind 3, adds the plugin to your
PostCSS config and installs `@c15t/ui`. If it can't tell which config to edit,
it prints the change to make. `styles.tw3.css` and `iab/styles.tw3.css` still
ship and work with the plugin.

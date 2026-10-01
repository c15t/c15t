---
packages:
  c15t: patch
  '@c15t/react': patch
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
  '@c15t/vue': patch
  '@c15t/astro': patch
  '@c15t/svelte': patch
  '@c15t/browser': patch
  '@c15t/cli': patch
---

### Load the Tailwind 3 PostCSS plugin from the package you installed

Every package that publishes a c15t stylesheet now exports the Tailwind 3 PostCSS plugin as `<package>/postcss-tailwind3`, so you no longer install `@c15t/ui` just to list it:

- `c15t/postcss-tailwind3` for apps that install `c15t` (React, Next.js, TanStack Start, Vue, Nuxt and Astro)
- `@c15t/svelte/postcss-tailwind3` for Svelte and SvelteKit
- `@c15t/browser/postcss-tailwind3` for script tag pages that style the light DOM
- `@c15t/react/postcss-tailwind3`, `@c15t/nextjs/postcss-tailwind3`, `@c15t/tanstack-start/postcss-tailwind3`, `@c15t/vue/postcss-tailwind3` and `@c15t/astro/postcss-tailwind3` for apps that install an adapter directly

```js title="postcss.config.mjs"
export default {
	plugins: {
		'c15t/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

Each one re-exports `@c15t/ui/postcss-tailwind3`, so configs that already list that name keep working. The plugin must still come before `tailwindcss`.

`c15t setup` now adds the plugin from the package it installs, `c15t/postcss-tailwind3`, or `@c15t/react/postcss-tailwind3` and `@c15t/nextjs/postcss-tailwind3` in apps that installed those directly, and no longer installs `@c15t/ui` for Tailwind 3. It leaves a config alone when any c15t `postcss-tailwind3` entry, including `@c15t/ui/postcss-tailwind3`, already runs before `tailwindcss`.

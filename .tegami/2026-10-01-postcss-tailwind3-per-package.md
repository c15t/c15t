---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Load the Tailwind 3 PostCSS plugin from the package you installed

Every package that publishes a c15t stylesheet exports the Tailwind 3 PostCSS
plugin as `<package>/postcss-tailwind3`, so you don't need to install
`@c15t/ui` for it. Use `c15t/postcss-tailwind3` if you installed `c15t`, or
the entry of the adapter you installed, such as
`@c15t/svelte/postcss-tailwind3` or `@c15t/browser/postcss-tailwind3`.

```js title="postcss.config.mjs"
export default {
	plugins: {
		'c15t/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

`@c15t/ui/postcss-tailwind3` keeps working. The plugin must come before
`tailwindcss`. `c15t setup` adds the plugin from the package it installs and no
longer installs `@c15t/ui` for Tailwind 3.

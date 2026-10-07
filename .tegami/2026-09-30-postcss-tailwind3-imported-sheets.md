---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Unwrap every c15t stylesheet for Tailwind 3

`@c15t/ui/postcss-tailwind3` unwraps the `@layer` blocks of every stylesheet a
c15t package publishes, not only `@c15t/ui` and `@c15t/browser`. This fixes an
unstyled Svelte banner when importing `@c15t/svelte/styles.css`, and an Astro
build error ("`@layer components` is used but no matching `@tailwind
components` directive is present") from `@c15t/astro/styles.css`.

In a monorepo, the plugin no longer unwraps another workspace's
`packages/ui/dist` or `packages/browser/dist` stylesheets unless the package is
named `c15t` or `@c15t/*`.

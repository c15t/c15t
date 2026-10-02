---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Keep Vue components styled next to Tailwind 4

Vue components import their stylesheets one component at a time, and Vite links those stylesheets ahead of the app's CSS when they share a chunk. The first of them declared `@layer components` before Tailwind 4 declared `base`, so Tailwind's preflight removed the banner's padding, borders and button backgrounds. Each `@c15t/ui/styles/components/*.css` file now opens with Tailwind 4's layer order, `@layer properties, theme, base, components, utilities;`, as the aggregate stylesheets already did.

The dialog trigger stylesheet now keeps its rules in `@layer components` as well, so a Tailwind utility passed to the Vue trigger overrides it the same way it does in React.

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

With Tailwind 4, Tailwind's preflight could strip the padding, borders and
button backgrounds from Vue components, because their stylesheets declared
`@layer components` before Tailwind declared `base`. Each
`@c15t/ui/styles/components/*.css` file opens with
`@layer properties, theme, base, components, utilities;`. The dialog trigger's
rules also move into `@layer components`, so Tailwind utilities on the Vue
trigger override them as in React.

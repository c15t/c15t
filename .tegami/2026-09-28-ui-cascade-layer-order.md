---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Keep c15t styles above Tailwind v4 preflight

c15t's layered stylesheets, including `@c15t/astro/styles.css`, open with
Tailwind v4's layer order, `@layer properties, theme, base, components,
utilities;`. Before, loading c15t's stylesheet ahead of Tailwind's let
preflight strip the banner's padding and borders, which hit Astro sites using
Tailwind v4.

If your CSS declares its own layer order, load it before c15t's stylesheet. The
`.tw3.css` files are unchanged.

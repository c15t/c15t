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

The layered stylesheets (`styles.css`, `styles/dialog.css`, `styles/primitives.css` and `iab/styles.css`) and `@c15t/astro/styles.css` now open with Tailwind v4's layer order, `@layer properties, theme, base, components, utilities;`. Cascade layers rank by the order they are first named, so a page that loaded c15t's stylesheet before Tailwind's put `components` below Tailwind's `base`, and preflight removed the banner's padding and borders. This happened on Astro sites using Tailwind v4, where the integration injects c15t's stylesheet first, and in apps that import c15t's stylesheet above their own. The order now holds whichever sheet loads first.

Without Tailwind the extra layers stay empty. If your CSS declares its own layer order, load that statement before c15t's stylesheet. The `.tw3.css` files are unchanged, and `@c15t/ui/postcss-tailwind3` removes the statement for Tailwind 3.

---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Pass `colorScheme` through `generateThemeCSS` from `@c15t/react/utils`

`generateThemeCSS(theme, colorScheme)` from `@c15t/react/utils` now takes the same `colorScheme` argument as the one in `@c15t/ui/theme` and writes the same CSS. It used to drop the argument, so `'dark'` and `'system'` produced light-only CSS.

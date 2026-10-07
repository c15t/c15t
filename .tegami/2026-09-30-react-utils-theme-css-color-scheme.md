---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Pass `colorScheme` through `generateThemeCSS` in `@c15t/react/utils`

`generateThemeCSS(theme, colorScheme)` from `@c15t/react/utils` writes the same
CSS as the one in `@c15t/ui/theme`. It used to drop `colorScheme`, so `'dark'`
and `'system'` produced light-only CSS.

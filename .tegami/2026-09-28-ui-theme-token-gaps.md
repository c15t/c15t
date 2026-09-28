---
packages:
  '@c15t/ui': patch
---

### Let the theme reach legal links, the ConsentGate placeholder and IAB highlights

Several parts of the UI used fixed values instead of theme tokens, so a custom `theme` left them on c15t's defaults. They now follow the theme:

- Legal links use `colors.primary`. In dark mode they use the dark primary, which is lighter than the previous fixed blue.
- The ConsentGate placeholder takes its font, colors, radius and shadow from the theme.
- The IAB dialog's selected-vendor banner and search focus ring are tints of `colors.primary` instead of a fixed blue.
- A disabled switch's outline uses `colors.border`, so it no longer shows a light ring in dark mode.

With the default theme, the light-mode changes are small shifts in shade.

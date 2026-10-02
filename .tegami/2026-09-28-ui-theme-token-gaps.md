---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Let the theme reach legal links, the ConsentGate placeholder and IAB highlights

Several parts of the UI used fixed values instead of theme tokens, so a custom `theme` left them on c15t's defaults. They now follow the theme:

- Legal links use `colors.primary`. In dark mode they use the dark primary, which is lighter than the previous fixed blue.
- The ConsentGate placeholder takes its font, colors, radius and shadow from the theme.
- The IAB dialog's selected-vendor banner and search focus ring are tints of `colors.primary` instead of a fixed blue.
- A disabled switch's outline uses `colors.border`, so it no longer shows a light ring in dark mode.
- The preference accordion and vendor list focus rings use `colors.primary`, with the same dark-mode fix as legal links. Their arrows and category descriptions are shades of `colors.textMuted`, matching the old greys with the default theme.
- The dialog and banner entrance springs, accordion and collapsible fades, tab transitions and the placeholder fade-in use the `motion` easings and durations.
- The IAB dialog title and banner title use `typography.fontSize.lg`, and the dialog footer and legal links use `fontSize.sm`.

With the default theme, the light-mode changes are small shifts in shade and easing.

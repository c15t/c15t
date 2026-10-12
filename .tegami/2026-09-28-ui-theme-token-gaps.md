---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Let the theme reach legal links, the ConsentGate placeholder and IAB highlights

Several UI parts used fixed values and ignored a custom `theme`. They follow it
now.

- Legal links and the preference accordion and vendor list focus rings use
  `colors.primary`. The IAB dialog's selected-vendor banner and search focus
  ring use tints of it.
- The ConsentGate placeholder takes its font, colors, radius and shadow from the
  theme.
- A disabled switch's outline uses `colors.border`, so dark mode no longer shows
  a light ring.
- Accordion arrows and category descriptions use shades of `colors.textMuted`.
- Dialog and banner entrances, fades and tab transitions use the `motion`
  easings and durations.
- IAB dialog and banner titles use `typography.fontSize.lg`, and the dialog
  footer and legal links use `fontSize.sm`.

With the default theme, links and focus rings are lighter in dark mode, and
light mode shifts slightly in shade and easing.

---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  '@c15t/browser': patch
---

### Switches follow the theme's primary color

The active switch track defaults to the primary color, in the light and dark
palettes and in a stylesheet that sets `--c15t-primary` directly. Before, a
theme that set `colors.primary` without `colors.switchTrackActive` kept the
switches blue. Set `colors.switchTrackActive` or `--c15t-switch-track-active`
for a different color. The default theme looks the same.

---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  '@c15t/browser': patch
---

### Switches follow the theme's primary color

A theme that set `colors.primary` without `colors.switchTrackActive` left the
consent switches in the default blue. The active switch track now defaults to
the primary color, in the light and dark palettes, and in a stylesheet that
sets `--c15t-primary` directly. Set `colors.switchTrackActive` or
`--c15t-switch-track-active` to give the switches a different color. The
default theme looks the same, since its switch color already equals its
primary color.

---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Switches follow the theme's primary color

The active switch track defaults to the primary color, in the light and dark
palettes and in a stylesheet that sets `--c15t-primary` directly. Before, a
theme that set `colors.primary` without `colors.switchTrackActive` kept the
switches blue. Set `colors.switchTrackActive` or `--c15t-switch-track-active`
for a different color. The default theme looks the same.

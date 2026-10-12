---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Use the theme's motion tokens on the floating trigger

The floating dialog trigger times its hover and snap transitions with
`--c15t-duration-slow`, `--c15t-easing-out` and `--c15t-easing-in-out`, so
`theme.motion` reaches it.

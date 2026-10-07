---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Keep fixed elements still when a consent dialog locks scrolling

A blocking banner or dialog no longer shifts fixed headers and side panels
sideways on systems with classic scrollbars, such as Windows. The scroll lock
sets `scrollbar-gutter: stable` on `<html>` instead of padding `<body>`, except
in browsers without `scrollbar-gutter`. It also works on pages that set
`overflow` on `<html>`, and restores inline `overflow-x` or `overflow-y` values
it replaced.

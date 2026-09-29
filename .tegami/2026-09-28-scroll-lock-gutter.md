---
packages:
  '@c15t/ui': patch
  '@c15t/browser': patch
---

### Keep fixed elements still when a consent dialog locks scrolling

A blocking banner or dialog no longer shifts the page sideways on systems that show classic scrollbars, such as Windows, Linux and macOS with "Always show scrollbars" enabled. The scroll lock used to pad `<body>` by the scrollbar width, which kept in-flow content in place but still widened the viewport, so fixed headers, right-aligned controls and side panels jumped by the scrollbar width. It now sets `scrollbar-gutter: stable` on `<html>` while the page is locked, so the viewport keeps its width. Pages without a visible scrollbar get no gutter, and a `stable` gutter the page already sets is left alone. Browsers without `scrollbar-gutter` support still get the `<body>` padding.

The lock now also works on pages that set `overflow` on `<html>`, where hiding `<body>` overflow alone did not stop the page scrolling, and it restores inline `overflow-x` or `overflow-y` values it replaced instead of clearing them.

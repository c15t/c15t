---
packages:
  "@c15t/ui": minor
---

### Keep fixed elements still while a blocking surface locks scrolling

When a blocking banner or the preference dialog locks page scrolling and no
`scrollbar-gutter` holds the scrollbar's space, c15t pads `<body>` instead.
That happens in browsers without `scrollbar-gutter`, and in Chromium on macOS
on pages that style their scrollbar with `::-webkit-scrollbar`. The padding
keeps page content still, but `position: fixed` elements moved right by the
scrollbar's width.

While it pads `<body>`, the lock now sets `--c15t-scroll-lock-gap` on `<html>`
to the same width. Use it to keep your fixed elements still:

```css
.chat-button {
  right: calc(1rem + var(--c15t-scroll-lock-gap, 0px));
}
```

The padding and the variable now also account for CSS `zoom` on `<html>` or
`<body>`, in browsers with `Element.currentCSSZoom`. Before, `html { zoom: 2 }`
doubled the padding, so page content moved left by the scrollbar's width while
the lock held. Browsers without `currentCSSZoom` behave as before.

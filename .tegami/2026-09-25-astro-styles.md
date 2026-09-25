---
packages:
  '@c15t/astro': patch
  '@c15t/cli': patch
---

### Ship Astro consent styles automatically

The quickstart said the integration supplies styles, but it did not. On the
server, the components read class names through the `node` export condition,
which imports no CSS, so the banner and dialog rendered unstyled unless you
imported the stylesheet yourself.

The integration now adds `@c15t/astro/styles.css` to every page, plus the new
`@c15t/astro/iab/styles.css` when `iab` is set. Remove your own import of the
stylesheet. Set `styles: false` to keep loading it yourself, for example from
a global stylesheet that orders its own cascade layers.

The CLI's Astro boilerplate no longer imports the stylesheet.

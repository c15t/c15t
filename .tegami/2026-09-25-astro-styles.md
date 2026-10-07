---
packages:
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Ship Astro consent styles automatically

The integration adds `@c15t/astro/styles.css` to every page, plus the new
`@c15t/astro/iab/styles.css` when `iab` is set. Before, the banner and dialog
rendered unstyled unless you imported the stylesheet yourself. Remove that
import, or set `styles: false` to keep loading it yourself. The CLI's Astro
boilerplate no longer imports it.

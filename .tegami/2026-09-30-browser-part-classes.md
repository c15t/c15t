---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Style stock UI parts with `theme.slots`, `::part()` and `stylesheetURLs`

The banner, preference centre, floating trigger and IAB surfaces apply
`ui.theme.slots`, as `@c15t/ui` and `@c15t/svelte` do. A slot such as
`consentBannerCard` or `buttonPrimary` takes a class string or
`{ className, style }`, and `noStyle: true` on a slot drops that part's stock
classes.

Each part carries its slot key in a `part` attribute, so page CSS can target it
with `[data-c15t-ui]::part(consentBannerCard)`.

Page classes reach parts only with `shadow: false`. In the default shadow root,
list your stylesheets in `ui.stylesheetURLs` to use Tailwind, CSS Modules or
vanilla-extract classes there. Numeric `style` values get `px` where the
property takes a unit, as in React. An experiment arm's `theme.slots` merge over
the host theme's.

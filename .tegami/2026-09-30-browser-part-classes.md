---
packages:
  '@c15t/browser': patch
---

### Style stock UI parts with `theme.slots`, `::part()` and `stylesheetURLs`

The banner, preference centre, floating trigger and IAB surfaces now apply `ui.theme.slots`, the per-part class and style map `@c15t/ui` and `@c15t/svelte` already read. A slot such as `consentBannerCard`, `consentDialogCard`, `consentDialogTrigger`, `buttonPrimary` or `toggle` takes a class string or `{ className, style }`, and `noStyle: true` on a slot replaces that part's stock classes. Slot classes stay when `ui.noStyle` is set.

Each of those parts also carries its slot key in a `part` attribute, so page CSS can style it inside the shadow root with `[data-c15t-ui]::part(consentBannerCard)`.

A class from the page's stylesheet only reaches a part with `shadow: false`. In the default shadow root, the new `ui.stylesheetURLs` option links stylesheets inside it, after the bundled one and with the client's nonce, so Tailwind, CSS Modules or vanilla-extract classes apply there too. The script tag accepts both through `c15t.push(['config', { ui: { … } }])`.

A slot's numeric `style` values get `px` where the property takes a unit, as React writes them: `{ padding: 8 }` renders `padding: 8px`, while `opacity`, `zIndex`, `flexGrow`, `lineHeight` and the other unitless properties keep the bare number. An experiment arm's `theme.slots` apply to the parts of visitors assigned that arm, merged over the host theme's slots. When the arm changes after the UI mounts, the floating trigger and its icon drop the previous arm's slot classes and styles and take the new arm's.

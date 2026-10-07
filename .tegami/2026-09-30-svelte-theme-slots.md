---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Apply every `theme.slots` style in Svelte

Every stock banner, dialog and preference widget part in Svelte applies both the
classes and the `style` of its slot. Svelte used to drop `style` on most parts
and write camelCase keys as invalid CSS. `consentDialogOverlay`,
`consentWidgetAccordion`, `toggle` and the IAB root, card, header and footer
slots take effect, and legal links keep only their stock class, as in React and
Vue.

Numeric `style` values get `px` where the property takes a unit, so
`{ padding: 8 }` renders `padding:8px`, while `opacity` and `zIndex` stay
unitless.

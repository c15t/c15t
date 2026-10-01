---
packages:
  '@c15t/svelte': patch
---

### Apply every `theme.slots` style in Svelte

Every stock banner, dialog and preference widget part now takes both the classes and the `style` of its slot. Svelte used to drop `style` on most parts, write camelCase keys such as `backgroundColor` as invalid CSS, ignore `consentDialogOverlay`, and give legal links the classes of the description slot around them. `consentWidgetAccordion` and `toggle` now reach the category list and the category switches, and the IAB banner and dialog now apply their root, card, header and footer slots. Legal links now keep only their stock class, as in React and Vue.

Numeric `style` values get `px` where the property takes a unit, as in React: `{ padding: 8 }` renders `padding:8px`, and unitless properties such as `opacity` or `zIndex` keep the bare number.

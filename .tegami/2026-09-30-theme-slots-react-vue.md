---
packages:
  '@c15t/ui': minor
  '@c15t/react': minor
  '@c15t/vue': minor
  '@c15t/astro': patch
---

### Apply `theme.slots` in React and Vue

`theme.slots` now styles the stock parts in React and Vue, as it already did in Svelte, Astro and the script tag. Each slot maps onto the matching `components` part (`consentDialogCard` onto `dialog.card`, `toggle` onto `switch.root`), and `components` wins where both set the same attribute. A slot with `noStyle: true` drops that part's stock classes and keeps the slot's and the part's own classes, as in the other adapters; a slot that sets only `noStyle` applies too. React used to accept `theme.slots` in its types and ignore it.

The `frame` and `consentDialogFooter` slot keys are removed: no adapter read them. Style the stock dialog's footer with `consentWidgetFooter`, and the `ConsentGate` placeholder with the new `consentGate` slots.

In Vue, the assigned experiment arm's `theme.slots` merge over the host theme's, as they already did in React, so an arm that changes only a slot renders its classes and styles.

A numeric length in a slot style, such as `{ padding: 8 }`, now renders as `8px` in Vue too. Vue writes style objects as given, so the number used to be dropped.

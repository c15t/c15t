---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
---

### Apply `theme.slots` in React and Vue

`theme.slots` styles the stock parts in React and Vue, as it already did in
Svelte, Astro and the script tag. React used to accept it in its types and
ignore it. Each slot maps onto the matching `components` part, and `components`
wins where both set the same attribute. A slot with `noStyle: true` drops that
part's stock classes.

The `frame` and `consentDialogFooter` slot keys are removed, since no adapter
read them. Use `consentWidgetFooter` for the stock dialog's footer and the new
`consentGate` slots for the `ConsentGate` placeholder.

In Vue, an experiment arm's `theme.slots` merge over the host theme's, and a
numeric length in a slot style, such as `{ padding: 8 }`, renders as `8px`.

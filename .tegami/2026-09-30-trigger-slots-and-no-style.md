---
packages:
  '@c15t/ui': patch
  '@c15t/svelte': patch
---

### Add trigger slots and keep slot classes under `noStyle`

`theme.slots` gains `consentDialogTrigger` and `consentDialogTriggerIcon` for the floating button that reopens the preference center and its icon, the parts React and Vue style with `components.trigger.root` and `components.trigger.icon`. The Svelte `ConsentDialogTrigger` applies both, including a slot's `style`.

`resolveStyles` now keeps theme slot classes and styles under `noStyle` and drops only the stock classes. Before, a component that passed its own `noStyle` flag lost the theme slot's classes, and one that passed a `baseClassName` kept the stock class. In `@c15t/svelte`, the banner, dialog and widget parts now keep their `theme.slots` classes when `noStyle` is set, and the widget's footer button group reads `consentWidgetFooterSubGroup` instead of `consentWidgetFooter`.

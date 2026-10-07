---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Add trigger slots and keep slot classes under `noStyle`

`theme.slots` gains `consentDialogTrigger` and `consentDialogTriggerIcon` for
the floating button that reopens the preference center and its icon. The
Svelte `ConsentDialogTrigger` applies both, including a slot's `style`.

`resolveStyles` keeps theme slot classes and styles under `noStyle` and drops
only the stock classes. In `@c15t/svelte`, the banner, dialog and widget keep
their `theme.slots` classes under `noStyle`, and the widget's footer button
group reads `consentWidgetFooterSubGroup` instead of `consentWidgetFooter`.

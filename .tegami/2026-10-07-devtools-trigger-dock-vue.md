---
packages:
  '@c15t/vue': minor
  c15t: minor
---

### Open DevTools from the Vue consent trigger

When `ConsentDevTools` from `c15t/vue/devtools` is mounted next to a visible
`ConsentDialogTrigger`, the trigger becomes a two-button toolbar with a
DevTools button, and DevTools hides its floating launcher, so the two no
longer overlap in the same corner. The panel opens beside the toolbar and
follows it when it is dragged to another corner. DevTools restores its own
launcher whenever the trigger is hidden. The toolbar takes the
`components.trigger.toolbar`, `toolbarItem` and `toolbarIcon` parts.

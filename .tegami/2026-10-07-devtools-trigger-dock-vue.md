---
packages:
  '@c15t/vue': minor
  c15t: minor
---

### Open DevTools from the Vue consent trigger

With `ConsentDevTools` from `c15t/vue/devtools` mounted next to a visible
`ConsentDialogTrigger`, the trigger becomes a two-button toolbar with a DevTools
button, and DevTools hides its floating launcher. The panel opens beside the
toolbar and follows it when dragged. DevTools restores its own launcher when the
trigger is hidden. Style the toolbar with the `components.trigger.toolbar`,
`toolbarItem` and `toolbarIcon` parts.

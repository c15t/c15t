---
packages:
  '@c15t/dev-tools': minor
  '@c15t/react': minor
  '@c15t/ui': patch
  c15t: minor
---

### Open DevTools from the consent trigger toolbar

With `<ConsentDevTools>` mounted next to a visible `ConsentDialogTriggerToolbar`
or `ConsentDialogTrigger`, the trigger shows a DevTools button and DevTools
hides its floating launcher, so the two no longer overlap.
`ConsentDialogTrigger` becomes a two-button toolbar. The panel opens beside the
toolbar and follows it when dragged. DevTools restores its own launcher when no
trigger is visible.

For hosts that render their own launcher, DevTools instances gain
`dock(placement | null)` and `DevToolsState` reports the current `dock`.

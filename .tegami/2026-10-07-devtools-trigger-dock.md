---
packages:
  '@c15t/dev-tools': minor
  '@c15t/react': minor
  '@c15t/ui': patch
  c15t: minor
---

### Open DevTools from the consent trigger toolbar

When `<ConsentDevTools>` is mounted next to a visible
`ConsentDialogTriggerToolbar` or `ConsentDialogTrigger`, the trigger shows a
DevTools button and DevTools hides its floating launcher, so the two no longer
overlap in the same corner. The panel opens beside the toolbar and follows it
to whichever corner it is dragged. `ConsentDialogTrigger` becomes a two-button
toolbar while DevTools is mounted. DevTools restores its own launcher whenever
no trigger is visible.

DevTools instances gain `dock(placement | null)`, and `DevToolsState` reports
the current `dock`, for hosts that render their own launcher.

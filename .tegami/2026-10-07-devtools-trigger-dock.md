---
packages:
  "@c15t/dev-tools":
    replay:
      - exit-prerelease(npm:@c15t/dev-tools)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
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

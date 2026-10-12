---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Open DevTools from the Svelte consent trigger

When `ConsentDevTools` is mounted next to a visible `ConsentDialogTrigger`, the
trigger gains a DevTools button and DevTools hides its floating launcher, so
the two no longer overlap. The panel opens beside the trigger and follows it
when dragged. The launcher returns whenever no trigger is visible.

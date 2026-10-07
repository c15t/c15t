---
packages:
  '@c15t/svelte': minor
---

### Open DevTools from the Svelte consent trigger

When `ConsentDevTools` is mounted next to a visible `ConsentDialogTrigger`,
the trigger becomes a two-button toolbar with a DevTools button, and DevTools
hides its floating launcher, so the two no longer overlap in the same corner.
The panel opens beside the toolbar and follows it to whichever corner it is
dragged. DevTools restores its own launcher whenever no trigger is visible.

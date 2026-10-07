---
packages:
  '@c15t/browser': minor
---

### Open DevTools from the script-tag consent trigger

When DevTools is mounted next to the stock floating trigger, through
`mountDevTools` or the `c15t.devtools.js` tag, the trigger becomes a two-button
toolbar with a DevTools button and DevTools hides its floating launcher, so the
two no longer overlap in the same corner. The panel opens beside the toolbar
and follows it to whichever corner it is dragged. DevTools restores its own
launcher while the trigger is hidden, for example while the banner is open.
The tags can load in either order.

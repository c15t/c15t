---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Open DevTools from the script-tag consent trigger

When DevTools is mounted next to the stock floating trigger, through
`mountDevTools` or the `c15t.devtools.js` tag, the trigger becomes a toolbar
with a DevTools button and DevTools hides its own launcher. The panel opens
beside the toolbar and follows it when dragged. The tags can load in either
order.

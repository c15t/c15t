---
packages:
  '@c15t/browser': patch
---

### Replay every queued script-tag call

Calls pushed onto `window.c15t` before the script loads now all run. Before, queueing any method other than `config`, `on` or `onInit` threw during replay and dropped every call queued after it.

`config`, `init`, `on` and `onInit` still run in place. `subscribe` attaches once the client exists. Actions such as `openDialog`, `showBanner`, `acceptAll`, `rejectAll`, `save`, `setLanguage` and `identify` run in queue order once the policy has resolved, so a queued `openDialog` is not replaced by the banner. Methods that only return a value, such as `getSnapshot` or `has`, and unknown names are skipped with a console warning. A queued call that throws is reported with `console.error` and the calls after it still run.

`window.c15t.push([...])` also works after the script has loaded: it runs each call the same way as a call queued before load. Actions from separate `push()` calls also run in order: each batch waits for the actions from earlier calls to settle, so `c15t.push(['acceptAll']); c15t.push(['rejectAll']);` always ends with consent rejected. `c15t.dispose()` drops actions that have not run yet, so they never reach the disposed client or the one a later `init()` creates, and actions pushed after it run as usual. Actions that a listener pushes while a batch runs `init`, for example from a `ready` listener, run after that batch's own actions. A snippet written as `window.c15t = window.c15t || []; c15t.push([...])` no longer throws when it runs after the tag.

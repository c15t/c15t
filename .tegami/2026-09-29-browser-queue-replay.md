---
packages:
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
---

### Replay every queued script-tag call

Every call pushed onto `window.c15t` before the script loads now runs. Before,
queueing a method other than `config`, `on` or `onInit` threw during replay and
dropped every call after it.

Actions such as `openDialog`, `acceptAll` and `setLanguage` run in queue order
once the policy has resolved. Methods that only return a value, such as
`getSnapshot`, and unknown names are skipped with a console warning. A call that
throws is logged and the rest still run.

`window.c15t.push([...])` also works after the script loads, and actions from
separate `push()` calls run in order, so `c15t.push(['acceptAll']);
c15t.push(['rejectAll']);` ends with consent rejected. `c15t.dispose()` drops
actions that have not run yet.

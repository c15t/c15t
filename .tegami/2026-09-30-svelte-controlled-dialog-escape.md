---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Keep a `ConsentDialog` held open by `open` on screen after Escape

With `open={true}`, pressing Escape closed the dialog, which then mounted
again as a new element and moved focus. The dialog now follows `open`, as
`ConsentDialog` does in `@c15t/react`: Escape sets the active UI to `'none'`,
and the dialog stays until `open` turns `false`. Without `open`, Escape
closes the dialog as before.

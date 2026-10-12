---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Keep a `ConsentDialog` held open by `open` on screen after Escape

With `open={true}`, Escape closed the dialog and it remounted as a new element,
moving focus. The dialog follows `open` as in `@c15t/react`. Escape sets the
active UI to `'none'` and the dialog stays until `open` turns `false`.

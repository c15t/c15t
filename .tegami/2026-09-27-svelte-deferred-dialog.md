---
packages:
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Load the Svelte consent dialog after the first paint

`ConsentDialog` from `@c15t/svelte` loads in its own chunk instead of with the
page. It loads in idle time after the page's load event while a button that
opens it is mounted, when that button is hovered or focused, or at the latest
when the dialog opens. Idle loading is skipped with Save-Data, on 2G and
offline. Set `preloadDialog: 'intent'` in the provider options to load only on
hover, focus or open. If the load fails, the banner or trigger comes back and
the next attempt retries.

`ConsentDialog`'s own `showTrigger` trigger appears after hydration instead of
in the server HTML. Render `ConsentDialogTrigger` next to the dialog to keep it
in the server HTML.

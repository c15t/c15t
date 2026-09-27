---
packages:
  '@c15t/svelte': patch
---

### Load the Svelte consent dialog after the first paint

`ConsentDialog` from `@c15t/svelte` no longer ships in the page's first load.
The dialog, the preference widget inside it and their primitives load in
their own chunk, before the first open:

- in browser idle time after the page's load event, while a button that opens
  the dialog is mounted (the banner's Customize button, `ConsentDialogLink`,
  `ConsentDialogTrigger` or the `ConsentGate` placeholder);
- when one of those buttons is hovered or focused;
- at the latest when the dialog opens.

Idle loading is skipped with Save-Data, on 2G connections and offline. Set
`preloadDialog: 'intent'` in the provider options to load the dialog only on
hover, focus or open. A failed load is retried on the next hover, focus or
open.

`ConsentDialog`'s own `showTrigger` trigger now appears once the dialog chunk
has loaded, right after hydration, instead of in the server HTML. Render
`ConsentDialogTrigger` next to the dialog to keep it in the server HTML.

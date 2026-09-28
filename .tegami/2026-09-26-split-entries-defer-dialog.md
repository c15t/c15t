---
packages:
  c15t: major
  "@c15t/react": major
---

### Defer the dialog and widget on their split entries

**Breaking.** `@c15t/react/consent-dialog` and `c15t/react/consent-dialog` now export the deferred `ConsentDialog`, the same component as the `@c15t/react` root. The dialog's code loads when it first opens, so importing the split entry no longer puts the dialog in every page's first load. Before, this entry exported the dialog itself. In a Next.js production build of a provider, banner, dialog and link imported from split entries, the change takes 4,411 B gzip of JavaScript out of what the page requests before its `load` event.

`@c15t/react/consent-widget` and `c15t/react/consent-widget` likewise export the deferred `ConsentWidget` from the root entry.

Both entries now export only the component and its prop and compound types. The individual parts they also exported, such as `Card`, `Header`, `Overlay`, `ConsentDialogRoot`, `Accordion`, `Switch` and `Footer`, are no longer exported from them.

#### Migration

- `<ConsentDialog />` and `<ConsentWidget />` from the split entries need no change. `ConsentDialog.Card` and the other `ConsentDialog.<Part>` properties still work and load with the dialog's chunk.
- If you imported a part by name, import it from the component entry instead:

  ```ts
  // Before
  import { Card, Header } from 'c15t/react/consent-dialog';
  // After
  import { Card, Header } from 'c15t/react/components/consent-dialog';
  ```

- To keep the dialog in the first load, import `ConsentDialog` from `c15t/react/components/consent-dialog` (or `@c15t/react/components/consent-dialog`). The first open then needs no download, and every visitor downloads the dialog.

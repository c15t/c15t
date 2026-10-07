---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
---

### Defer the dialog and widget on their split entries

Breaking. `@c15t/react/consent-dialog` and `c15t/react/consent-dialog` export
the deferred `ConsentDialog`, whose code loads when it first opens.
`@c15t/react/consent-widget` and `c15t/react/consent-widget` export the
deferred `ConsentWidget`. Both entries export only the component and its types.
Parts such as `Card`, `Header`, `Overlay`, `ConsentDialogRoot`, `Accordion`,
`Switch` and `Footer` are no longer exported from them.

#### Migration

- `<ConsentDialog />`, `<ConsentWidget />` and `ConsentDialog.<Part>` need no
  change.
- Import named parts from the component entry:

  ```ts
  // Before
  import { Card, Header } from 'c15t/react/consent-dialog';
  // After
  import { Card, Header } from 'c15t/react/components/consent-dialog';
  ```

- To keep the dialog in the first load, import `ConsentDialog` from
  `c15t/react/components/consent-dialog`.

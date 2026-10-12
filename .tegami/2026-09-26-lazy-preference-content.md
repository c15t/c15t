---
packages:
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
---

### Mount collapsed preference content on first open

Breaking. Collapsed rows in the preferences dialog and `ConsentWidget` render
empty content until they first open, then stay mounted. This covers category
rows, vendor cards and IAB purpose, stack and vendor rows. Keyboard and
screen-reader behavior does not change. With 100 declared vendors, opening the
dialog mounts 112 React components instead of 1,625.

#### Migration

- Tests that read a category description, vendor card or vendor details need to
  open its row first. `consent-widget-accordion-content-*` and
  `consent-widget-vendor-content-*` still exist while collapsed, but they are
  empty.
- Custom `PreferenceItem` compositions that need collapsed children in the DOM
  can pass the new `forceMount` prop to `PreferenceItem.Content` (React and
  Svelte) or `PreferenceItemContent` (Vue).

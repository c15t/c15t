---
packages:
  "@c15t/react": major
  "@c15t/vue": major
  "@c15t/svelte": major
---

### Mount collapsed preference content on first open

**Breaking.** A collapsed row in the preferences dialog or `ConsentWidget` no longer renders its content until it first opens. This applies to category rows, vendor cards and IAB purpose, stack and vendor rows. The content element is still rendered, empty, so the trigger's `aria-controls` target exists. Its children mount the first time the row opens and then stay mounted, so the close transition keeps its content. Collapsed content was already `inert` and `aria-hidden`, so keyboard and screen-reader behavior does not change.

Opening the dialog used to mount every vendor card inside the collapsed categories. With 100 declared vendors that was 1,625 React components and 1,811 DOM nodes. It is now 112 components and 103 nodes, the same as with no vendors, and the React commit at 4× CPU slowdown drops from 36 ms to 13 ms.

#### Migration

If your CSS shows collapsed content, or a test reads it before the row opens, pass `forceMount` to the `PreferenceItem.Content` primitive (React, Vue and Svelte) to render its children while collapsed. Otherwise, open the row before reading its content.

---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  'c15t': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
  '@c15t/browser': patch
  '@c15t/astro': patch
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
---

### Keep the preference dialog's category list scrollable

The category list in the preference dialog scrolls again when your CSS sets
`overflow: hidden` on the list or on its category rows, for example to clip
them to rounded corners. Before, a category with vendors could be cut off in
the capped dialog on a phone, with no way to scroll to the rest.

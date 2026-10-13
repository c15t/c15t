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

### The preference dialog scrolls with your CSS

Visitors can scroll to every category and vendor in the preference dialog
again. Before this fix, the category list did not scroll with some app CSS.
The cause was `overflow: hidden` on the category list or on a category row,
for example to clip them to rounded corners. On a phone, a category with
vendors then went past the bottom of the dialog. The visitor could not scroll
to the rest.

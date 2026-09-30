---
packages:
  '@c15t/vue': patch
---

### Hide IAB Feature chevrons from screen readers

The chevrons in the Vue IAB preference centre's Feature rows are now `aria-hidden`, as they are in React and Svelte. Screen readers no longer announce an unnamed image before each Feature, its examples and its vendor list.

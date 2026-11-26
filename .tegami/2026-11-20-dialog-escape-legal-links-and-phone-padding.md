---
packages:
  '@c15t/ui': patch
  '@c15t/browser': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/vue': patch
---

### Fix Escape with stacked dialogs, legal links and phone padding

- Escape closes only the top dialog across preference and IAB dialogs.
- The preference dialog close button reserves header space without relying on CSS `:has()`.
- Vue leaves out a legal link that has no URL instead of linking to `#`.
- Legal links that open in a new tab get `rel="noopener noreferrer"` by
  default.
- The banner and preferences dialog use even padding on phones.

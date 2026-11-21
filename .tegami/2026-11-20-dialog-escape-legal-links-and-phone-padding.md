---
packages:
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Fix Escape with stacked dialogs, legal links and phone padding

- Escape closes only the top dialog.
- Vue leaves out a legal link that has no URL instead of linking to `#`.
- Legal links that open in a new tab get `rel="noopener noreferrer"` by
  default.
- The banner and preferences dialog use even padding on phones.

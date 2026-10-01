---
packages:
  '@c15t/svelte': patch
  '@c15t/browser': patch
---

### Open the preference dialog without animation when `disableAnimation` is set

The Svelte and script-tag preference dialogs no longer fade and scale in when `disableAnimation` is on. Their overlay and panel now carry `data-disable-animation`, as the Vue dialog does.

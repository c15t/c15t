---
packages:
  '@c15t/ui': patch
  '@c15t/react': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
  '@c15t/browser': patch
---

### Stop the floating trigger's transitions when `disableAnimation` is set

The floating dialog trigger and the trigger toolbar now carry `data-disable-animation` when the provider's `disableAnimation` is on, and the stylesheet then drops their hover and snap-to-corner transitions. They already stop under `prefers-reduced-motion: reduce`.

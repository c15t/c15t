---
packages:
  "@c15t/ui": patch
  "@c15t/react": patch
  "@c15t/svelte": patch
  "@c15t/vue": patch
  "@c15t/astro": patch
  "@c15t/browser": patch
---

### Show the consent banner without an entry animation

The banner and the IAB banner now appear on their first frame instead of
sliding or scaling in on a spring curve. The banner usually shows as the page
loads, where the overshoot read as layout shift. The backdrop of a blocking
banner appears with it. Hiding the banner still fades it out where it did
before, and `disableAnimation` still turns that off.

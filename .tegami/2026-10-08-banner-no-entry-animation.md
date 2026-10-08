---
packages:
  "@c15t/ui": minor
  "@c15t/schema": minor
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
banner appears with it.

Hiding the banner still fades it out where it did before, now without the slide
or scale, and on an ease-in curve so it speeds up as it leaves.
`disableAnimation` still turns the fade off.

Add the `--c15t-easing-in` theme token, set with `motion.easingIn`. It defaults
to `cubic-bezier(0.55, 0.055, 0.675, 0.19)` and sets the banner's exit curve.

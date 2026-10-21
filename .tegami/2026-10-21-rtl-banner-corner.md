---
packages:
  '@c15t/astro': patch
  '@c15t/browser': patch
  '@c15t/react': patch
  '@c15t/svelte': patch
  '@c15t/vue': patch
---

### The banner keeps its corner for right-to-left text

A floating or widget banner in its default corner used to jump to the other
side of the page when the visitor's language ran right to left, so a
`bottom-left` banner showed at the bottom right in Hebrew. The IAB banner in
`@c15t/browser` did the same. The page layout doesn't change with the
banner's language, so the banner shouldn't move either. It now stays in the
same corner in every language, and only its text runs right to left.

To put the banner on the right for right-to-left pages, set `position`
yourself.

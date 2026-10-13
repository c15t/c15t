---
packages:
  'c15t': patch
  '@c15t/astro': patch
  '@c15t/browser': patch
  '@c15t/vue': patch
  '@c15t/svelte': patch
---

### Space legal links after the banner description

Legal links in the banner and dialog now read the same in every framework as
they do in React: a space after the description, then the links separated by
commas, for example "…at any time. Privacy policy, Cookie policy".

- Astro: the links no longer run into the description or into each other, and
  they take the stock legal link style.
- Script tag (`@c15t/browser`): the links no longer run into the description
  or into each other.
- Vue and Nuxt: the links stay inline after the description. Before, they sat
  on a row of their own with a gap on each side of the comma.
- Svelte: the gaps around the links are one space wide.

---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Ship the stock dark palette in Vue and Nuxt

The token CSS that Vue and Nuxt write into `<style id="c15t-css-vars">` includes
the stock dark colors under `.dark` and `.c15t-dark`, as React and Svelte do.
Before, with `colorScheme` and `theme` unset, a `dark` class on `<html>` kept
the light colors.

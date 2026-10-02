---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
---

### Ship the stock dark palette in Vue and Nuxt

The token CSS that Vue and Nuxt write into `<style id="c15t-css-vars">` now carries the stock dark colors under the `.dark` and `.c15t-dark` selectors, as the React and Svelte stylesheet does. With `colorScheme` and `theme` unset, a `dark` class on `<html>` used to switch the class but leave the light colors in place.

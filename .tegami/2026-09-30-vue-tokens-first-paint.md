---
packages:
  '@c15t/vue': patch
  c15t: patch
---

### Apply Vue theme tokens before the first paint

The Nuxt module now adds the `tokens` CSS variables to the page head from its plugin, so server-rendered and prerendered HTML carries them on every page, with the configured `nonce`. The plain Vue plugin adds them to `document.head` when it is installed, before the first render, and removes them when the last app using them unmounts. A second app on the same page reuses the element, and a `<style id="c15t-css-vars">` rendered by the server is left in place. Before, the Vue `ConsentRoot` set them only after mount, so the first paint used the defaults, and surfaces composed without a `ConsentRoot` never got them.

For plain Vue apps rendered on the server, `generateTokensCSS()` from `@c15t/vue/vue-plugin` returns the same CSS to put in a `<style id="c15t-css-vars">` element in the server HTML.

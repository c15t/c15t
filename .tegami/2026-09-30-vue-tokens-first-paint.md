---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Apply Vue theme tokens before the first paint

The Nuxt module adds the `tokens` CSS variables to the page head, with the
configured `nonce`, so server-rendered and prerendered HTML carries them. The
plain Vue plugin adds them to `document.head` on install, before the first
render. Before, the first paint used the defaults.

For plain Vue apps rendered on the server, `generateTokensCSS()` from
`@c15t/vue/vue-plugin` returns the CSS to put in a
`<style id="c15t-css-vars">` element.

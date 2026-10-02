---
packages:
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Add `colorScheme` and dark theme tokens to Vue and Nuxt

The Vue plugin and the Nuxt module accept `colorScheme`, with the same values as the React and Svelte providers. `'light'` and `'dark'` force a scheme, `'system'` follows `prefers-color-scheme` as the visitor changes it, and leaving it unset mirrors a `dark` class on `<html>` into `c15t-dark`. `null` leaves `c15t-dark` to the site. Before, Vue never set `c15t-dark`, so the dark component styles only applied when the site set that class itself.

Both also accept `theme`, the same token object `@c15t/react` takes, including `theme.dark`. Its tokens go into the `<style id="c15t-css-vars">` element with `tokens`, and win where both set a variable. Vue still reads slot overrides from `components`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
	c15t: {
		colorScheme: 'system',
		theme: { dark: { primary: '#7fd1a8' } },
	},
	modules: ['@c15t/vue'],
});
```

Nuxt renders an inline script in `<head>` that sets `c15t-dark` for `'dark'` and `'system'`, with the configured `nonce`, so a dark visitor's first paint is already dark. `generateTokensCSS()` takes the scheme and theme as a second argument for plain Vue server rendering. A plugin given a borrowed `runtime` leaves the class to the host, as it does the tokens.

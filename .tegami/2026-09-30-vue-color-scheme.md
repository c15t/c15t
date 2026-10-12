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

The Vue plugin and Nuxt module accept `colorScheme`, as React and Svelte do.
`'light'` and `'dark'` force a scheme, `'system'` follows
`prefers-color-scheme`, unset mirrors a `dark` class on `<html>` into
`c15t-dark`, and `null` leaves `c15t-dark` to the site. Before, Vue never set
`c15t-dark`. Both also accept `theme`, the same token object `@c15t/react`
takes, including `theme.dark`.

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

Nuxt sets `c15t-dark` from an inline `<head>` script with the configured
`nonce`, so a dark visitor's first paint is dark. For plain Vue server
rendering, pass the scheme and theme to `generateTokensCSS()` as its second
argument.

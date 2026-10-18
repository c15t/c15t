---
packages:
  'c15t': patch
  '@c15t/vue': patch
---

### Nuxt starts a returning visitor's allowed scripts from the HTML

When a server render shows that a visitor's stored consent already allows
some `scripts` entries from `@c15t/integrations`, the Nuxt module now adds an
inline script at the end of `<body>`. After first paint, it runs their setup
and inserts their tags before the app hydrates. The script loader adopts
those tags instead of inserting its own.

Nothing starts from the HTML while the policy asks the visitor to choose, and
a prerendered route starts nothing. The inline script takes the module's
`nonce` option, and `nuxt-security` adds its per-request nonce. If a Content
Security Policy blocks it, the script loader starts the scripts after
hydration.

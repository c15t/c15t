---
packages:
  'c15t': patch
  '@c15t/core': patch
  '@c15t/integrations': patch
  '@c15t/nextjs': patch
---

### Next.js starts a returning visitor's allowed scripts from the HTML

When the server state from `resolveConsent()` shows that a visitor's stored
consent already allows some `scripts` entries from `@c15t/integrations`,
`ConsentRoot` now renders an inline script that runs their setup and inserts
their tags before the page hydrates. The script loader adopts those tags
instead of inserting its own. The inline script waits until after first paint,
so it doesn't delay First Contentful Paint. On a throttled mobile profile,
Google tag, Meta Pixel and TikTok Pixel started about 800 ms sooner.

Nothing starts from the HTML while the policy asks the visitor to choose: the
script loader starts those scripts after hydration, as before, so the banner
stays responsive. A state from a shared render, for prerendered or cached
HTML, starts nothing, since that HTML goes to every visitor. The inline script
takes `options.nonce`. If a Content Security Policy blocks it, the script
loader starts the scripts after hydration.

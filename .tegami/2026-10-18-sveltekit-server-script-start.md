---
packages:
  '@c15t/svelte': patch
---

### SvelteKit starts a returning visitor's allowed scripts from the HTML

When `c15tHandle` renders a page for a visitor whose stored consent already
allows some `scripts` entries from `@c15t/integrations`, it now adds an
inline script at the end of `<body>`. After first paint, it runs their setup
and inserts their tags before the page hydrates. The script loader adopts
those tags instead of inserting its own.

Nothing starts from the HTML while the policy asks the visitor to choose, and
a prerendered page starts nothing. The inline script takes the provider's
`nonce`, or else the nonce SvelteKit put on its own scripts. If a Content
Security Policy blocks it, the script loader starts the scripts after
hydration.

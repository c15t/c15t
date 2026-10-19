---
packages:
  'c15t': patch
  '@c15t/tanstack-start': patch
---

### TanStack Start starts allowed scripts from the HTML

When the state from the consent server function shows that the visitor's
consent already allows some `scripts` entries from `@c15t/integrations`,
through a stored choice or a policy that asks for none, `ConsentRoot` now
renders an inline script after the page content. After first paint, it runs
their setup and inserts their tags before the page hydrates. The script loader
adopts those tags instead of inserting its own. A streamed state starts them
from the chunk that carries the state.

Nothing starts from the HTML while the policy asks the visitor to choose, and
a prerendered page starts nothing. The inline script takes `options.nonce`. If
a Content Security Policy blocks it, the script loader starts the scripts
after hydration.

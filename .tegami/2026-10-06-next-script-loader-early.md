---
packages:
  "@c15t/core": patch
  "@c15t/nextjs": patch
---

### Returning visitors' scripts start sooner in Next.js

`ConsentRoot` loads the script loader during its first render in the browser
when the state from `resolveConsent()` carries a stored choice that allows one
of its `scripts` under the current policy, Global Privacy Control and the
visitor's vendor switches included, or when one of them has `alwaysLoad`.
With `enabled: false`, which grants every category, it always loads early. It
used to wait until the page had hydrated, so a returning visitor's consented
scripts waited for one more request after hydration. The chunk now loads while
React hydrates the page.

First visits and stored choices that allow none of the scripts load it after
hydration, as before. No visitor downloads more: every page with `scripts`
already loaded the chunk. There is nothing to configure.

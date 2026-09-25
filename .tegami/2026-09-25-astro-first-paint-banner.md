---
packages:
  '@c15t/astro': patch
---

### Show the offline Astro banner at first paint on prerendered pages

A prerendered banner ships hidden, because the same HTML serves visitors who
have already chosen. It used to stay hidden until the page's module scripts
loaded. An inline script after the banner now shows it straight away when the
visitor has nothing stored under any consent key, including a stored privacy directive. Blocked `localStorage` counts as nothing stored there. Visitors with a stored
record still wait for the runtime, which validates it. The new
`buildBannerRevealScript` helper is exported from `@c15t/astro/server`.

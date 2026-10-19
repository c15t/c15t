---
packages:
  'c15t': patch
  '@c15t/nextjs': patch
  '@c15t/tanstack-start': patch
---

### Allowed scripts start from the server HTML on React 18

`ConsentRoot` in Next.js and TanStack Start now starts the scripts a visitor's
consent already allows from the server HTML on React 18 too, as it does on
React 19. Next.js Pages Router apps on React 18 and TanStack Start apps on
React 18 no longer wait for hydration to start them. If the start module fails
to load, the page still renders and the scripts start after hydration.

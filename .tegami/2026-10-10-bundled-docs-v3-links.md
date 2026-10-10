---
packages:
  '@c15t/backend': patch
  '@c15t/browser': patch
  '@c15t/core': patch
  '@c15t/nextjs': patch
  '@c15t/react': patch
  '@c15t/scripts': patch
  '@c15t/svelte': patch
  c15t: patch
---

### Link v3 package docs to v3.c15t.com

The `AGENTS.md` files and bundled docs in v3 packages linked to `c15t.com`,
which documents v2. Those links now point at `v3.c15t.com`, so an agent that
follows them from `node_modules` reads docs for the installed version.

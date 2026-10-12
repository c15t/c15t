---
packages:
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/scripts":
    replay:
      - exit-prerelease(npm:@c15t/scripts)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Link v3 package docs to v3.c15t.com

The `AGENTS.md` files and bundled docs in v3 packages linked to `c15t.com`,
which documents v2. Those links now point at `v3.c15t.com`, so an agent that
follows them from `node_modules` reads docs for the installed version.

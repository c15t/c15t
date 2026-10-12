---
packages:
  "@c15t/schema":
    replay:
      - exit-prerelease(npm:@c15t/schema)
  "@c15t/core":
    replay:
      - exit-prerelease(npm:@c15t/core)
  "@c15t/backend":
    replay:
      - exit-prerelease(npm:@c15t/backend)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/vue":
    replay:
      - exit-prerelease(npm:@c15t/vue)
  "@c15t/browser":
    replay:
      - exit-prerelease(npm:@c15t/browser)
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
---

### Link a page's `/init` to the save that follows

c15t now sends a random journey id on `GET /init` and `POST /subjects` as query
parameters (`journey`, `journeyScope`, plus `stored` on `/init`).
Session reports gain `journey: { id, scope, storedChoice, prompt, domain }`, so
a backend can link a page load to the choice that follows without
fingerprinting or extra requests.

Set `journey` to choose how long the id lives: `'page'` (default, in memory),
`'tab'` (in `sessionStorage` while a prompt is due, on pages the browser
resolves) or `false`. In Next.js set it in `defineConsentConfig`; in TanStack
Start pass it to both `resolveConsent` and `ConsentRoot`. Vue, Svelte, Astro and
the script tag use `'page'` for now.

Request URLs now carry a query string. If you pass `hosted()` a `fetch` that
routes on the exact URL, match the path instead.

---
packages:
  '@c15t/schema': minor
  '@c15t/core': minor
  '@c15t/backend': minor
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  '@c15t/vue': patch
  '@c15t/browser': patch
  c15t: minor
---

### Link a page's `/init` to the save that follows

c15t now sends a random journey id on `GET /init` and `POST /subjects` as query
parameters (`c15tJourney`, `c15tJourneyScope`, plus `c15tStored` on `/init`).
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

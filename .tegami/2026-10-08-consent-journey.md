---
packages:
  '@c15t/schema': minor
  '@c15t/core': minor
  '@c15t/backend': minor
  '@c15t/react': minor
  '@c15t/nextjs': minor
  '@c15t/tanstack-start': minor
  c15t: minor
---

### Link a page's `/init` to the save that follows

The browser runtime creates a random journey id when it starts and sends it on
requests it already makes, as query parameters:

- `GET /init`: `c15tJourney`, `c15tJourneyScope` and `c15tStored` (`1` when a
  choice was already stored).
- `POST /subjects`: `c15tJourney` and `c15tJourneyScope`.

Session reports gain `journey: { id, scope, storedChoice, prompt, domain }`.
The backend's `/init` and the adapters' init routes fill it in from the
request. `prompt` is `due`, `stored` or `not-required`; a resolution with no
matched or configured policy still shows the fallback banner, so it counts as
`due` or `stored`. A report and a save with the same id belong to one page
load, so a dashboard can follow visitors from page load to choice without
fingerprinting or extra requests.

The id is not the subject id and is never written to a cookie. Set `journey`
on the provider or runtime to choose how long it lives:

- `'page'` (default): one id per page load, in memory.
- `'tab'`: kept in `sessionStorage` while a prompt is due, so a visitor who
  navigates before choosing keeps it, and removed after a choice.
- `false`: no journey.

Server renders start the journey, send it on their `/init` (with the page's
`Origin`, so the report gets its domain) or session report, and hand the id to
the browser in the state. `reportSessions: false` turns that off. React's early
`/init` and the inline prefetch script start it too, and the runtime continues
it, so every save with a journey follows an `/init` or report with the same
id. `buildPrefetchScript` takes `journey` and `storageKey`. A save replayed
after going offline carries no journey. Backends that do not read the
parameters ignore them.

`'tab'` suits pages that resolve init in the browser: a server render cannot
read `sessionStorage`, so it reports a new id on every page, and the browser
keeps the tab's id, which an earlier page reported. A kept id is dropped once a
page resolves to no prompt.

In Next.js, set `journey` in `defineConsentConfig`; `resolveConsent` and
`ConsentRoot` both read it. In TanStack Start, pass the same `journey` to
`resolveConsent` and `ConsentRoot`. A render that starts no journey
(`journey: false`, `reportSessions: false`, nothing to report to, a prefetch)
returns `journey: null`, and the browser sends none. Vue, Svelte, Astro and the
script tag use `'page'` for now.

Request URLs now carry a query string. If you pass `hosted()` a `fetch` that
routes on the exact URL, match the path instead.

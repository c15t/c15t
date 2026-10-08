---
packages:
  '@c15t/schema': minor
  '@c15t/core': minor
  '@c15t/backend': minor
  '@c15t/react': minor
  '@c15t/nextjs': patch
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
request. `prompt` is `due`, `stored` or `not-required`. A report and a save
with the same id belong to one page load, so a dashboard can follow visitors
from page load to choice without fingerprinting or extra requests.

The id is not the subject id and is never written to a cookie. Set `journey`
on the provider or runtime to choose how long it lives:

- `'page'` (default): one id per page load, in memory.
- `'tab'`: kept in `sessionStorage` while a prompt is due, so a visitor who
  navigates before choosing keeps it, and removed after a choice.
- `false`: no journey.

Server renders start the journey, send it on their `/init` or session report,
and hand the id to the browser in the state. `reportSessions: false` turns that
off. Backends that do not read the parameters ignore them.

Request URLs now carry a query string. If you pass `hosted()` a `fetch` that
routes on the exact URL, match the path instead.

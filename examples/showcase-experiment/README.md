# Banner experiment

The Northwind Coffee home page runs an A/B test on its cookie banner. Half
the visitors get the stock banner, a card in the bottom-left corner. The
other half get the same banner as a full-width bar along the bottom of the
page. The policy, the copy and the buttons are identical, so the only thing
the test measures is the shape.

| Arm | What the visitor sees |
| --- | --- |
| `control` | The stock floating card in Northwind's colors |
| `bar` | The same banner as a bar across the bottom of the page |

A feature flag picks the arm. When the flag has no value, c15t picks one
50/50 and keeps it for that visitor. Every banner impression and every choice
goes to an analytics stub with the arm attached, so you can compare opt-in
rates per arm.

## Files that matter

- [`lib/experiment.ts`](lib/experiment.ts) defines the experiment with
  `defineExperiment()` and has the flag lookup. Swap the stub for your flag
  provider.
- [`components/consent.tsx`](components/consent.tsx) passes the experiment
  and the flag's arm to `ConsentRoot`, and reports `onSurfaceShown` and
  `onChoiceRecorded` to analytics.
- [`lib/analytics.ts`](lib/analytics.ts) logs each event to the console.
  Its comment shows the one-line swap for PostHog, GA4 or GTM.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-experiment dev
```

Open <http://localhost:3115> and the browser console. You'll see lines like:

```text
[analytics] consent_banner_shown { arm: 'bar', assigned_by: 'c15t', experiment_id: 'banner-layout', surface: 'banner' }
[analytics] consent_choice_made { arm: 'bar', assigned_by: 'c15t', consent_action: 'all', experiment_id: 'banner-layout', surface: 'banner', time_to_decision_ms: 2140 }
```

The app runs in offline mode, so it needs no backend. c15t's bundled policy
rules ask for opt-in consent, and choices stay in the browser. For
production, replace `offline()` in `components/consent.tsx` with
`hosted({ url: 'https://your-project.inth.app' })`. The backend then counts
impressions and choices per arm on its own, including those of visitors your
analytics never loads for.

## See both arms

Set the flag when you start the app. `NEXT_PUBLIC_` variables are read at
build time, so restart the dev server or rebuild after changing it:

```sh
NEXT_PUBLIC_BANNER_LAYOUT=bar bun run --cwd examples/showcase-experiment dev
NEXT_PUBLIC_BANNER_LAYOUT=control bun run --cwd examples/showcase-experiment dev
```

With the flag set, the events say `assigned_by: 'host'`.

Without the flag, c15t assigns the arm and stores it under
`c15t-experiment-v1` in localStorage. To get a new draw, clear the site's
data (in Chrome DevTools: Application, Storage, Clear site data) and reload.
That also clears your consent, so the banner comes back.

## Learn more

- [Banner experiments](https://c15t.com/docs/guides/banner-experiments)
- [Choose your setup](https://c15t.com/docs/concepts/choose-your-setup)

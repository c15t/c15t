# Svelte devtools example

Run `bun run --cwd internals/fixtures/sveltekit-demo dev` from the repository root.
Open DevTools and select Scripts to inspect ten loading cases.

The demo uses the actual `@c15t/integrations` helpers for Meta Pixel, TikTok
Pixel, Google Tag, and Microsoft Clarity. By default, their SDK URLs point to local
fixtures. Their setup and consent callbacks run, but the fixtures do not send
events to vendor accounts. Script names explicitly identify fixture mode.

To test real SDKs, copy the optional `PUBLIC_*` IDs from `.env.example` into your
local environment and supply dedicated test accounts. Restart the dev server.
Each configured integration switches independently to its vendor URL. Real SDKs
can send telemetry; do not use production account IDs. Meta's automatic PageView
is disabled in this example.

The other cases cover inline execution, callback-only integration, an 800 ms
network delay, an intentional HTTP 503 error, and standard/custom IAB vendor
gates. `intentional-load-error` is expected to fail. IAB fixtures remain blocked
until their vendor requirements are met, independently of category consent.

Check both granting and revoking consent. Meta and TikTok retain their elements
and receive revocation callbacks. Google Tag also exercises its always-loaded
Consent Mode behavior. A loaded fixture proves the loader path worked, not that
a vendor received or accepted an event.

## IAB editor

Run `PUBLIC_DEVTOOLS_IAB=true bun run --cwd internals/fixtures/sveltekit-demo dev` to
use the local IAB playground. Open DevTools → IAB to edit vendor and purpose
consent, legitimate interest, and special-feature opt-ins. Search by name or ID;
the vendor list is paginated. The two IAB script fixtures respond to your edits.

This mode fetches the vendor list from inth.com and uses the example CMP ID.
Save generates a TC string in memory without contacting the consent backend;
reload resets the playground. It is not a production CMP configuration or a
backend persistence test. Real SDKs still require the explicit test IDs above.

## Consent example

These routes cover the SvelteKit docs recipes. The acceptance suite in
`internals/fixtures/acceptance` builds the app and runs every one of them:

| Route | Recipe |
| --- | --- |
| `/consent-example` | `loadConsent` with a `hosted()` handle in `src/hooks.server.ts`; banner in the server HTML |
| `/consent-example/static` | A prerendered page under the same layout; the browser resolves consent |
| `/consent-example/branded` | Theme tokens from `generateThemeCSS()` in a server load |
| `/manifest-example` | `loadConsent` with a `manifest()` handle; the browser re-inits through the route in `src/routes/api/c15t` |
| `/headless-example` | A custom banner from `getHeadlessConsent()` with the stock dialog |
| `/experiment-example` | The `/consent-example` setup with the banner experiment (not published) |

The docs quote `examples/sveltekit` and `internals/doc-snippets/sveltekit`, not
this app. The shared page content is in `src/lib/consent-example`.

Create an [Inth](https://inth.com) project, configure an opt-in policy covering
`measurement` and `marketing`, and allow this app's origin. Replace each
`https://your-project.inth.app` under `src/routes` with your project's backend
URL. The acceptance suite overrides it with `PUBLIC_C15T_BACKEND_URL` through
`src/lib/test-backend.ts`. Then run from the repository root:

```sh
bun run --cwd internals/fixtures/sveltekit-demo dev
```

Replace the placeholder vendor IDs in `src/lib/example-scripts.ts`: the PostHog
browser project key and the X Pixel ID (not a conversion event ID). The example
selects PostHog's EU region; change `region` for a US project.

PostHog uses `loadMode: 'after-consent'` and `cookieless_mode: 'never'`. X Pixel
waits for marketing permission. The YouTube nocookie iframe only mounts with
measurement permission and is removed on revocation. Use the footer's Privacy
settings control to reopen the dialog.

Test a fresh rejection, grant, reload and withdrawal:

```sh
EXAMPLE_TARGET=sveltekit bun run --cwd internals/fixtures/acceptance test
```

## Banner experiment

Open `/experiment-example?experiment=1` to run the banner-shape experiment:
c15t picks the `control` arm (the default banner) or the `wall` arm, and the
page shows `banner-shape · <arm> · c15t`.
`/experiment-example?experiment=1&arm=wall` sets the arm the way a flag
provider would; any other `arm` value runs `control`. The route has its own
layout, whose provider's `onSurfaceShown` and `onChoiceRecorded` callbacks
list each impression and choice under the arm and push them to
`window.dataLayer` as `c15t_surface_shown` and `c15t_choice_recorded`.
See https://c15t.com/docs/guides/banner-experiments.

The showcase at `/` and its routes live in `src/routes/(showcase)` with their
own provider and the `/api/showcase` endpoint. Benchmarks under `/bench` render
without a provider.

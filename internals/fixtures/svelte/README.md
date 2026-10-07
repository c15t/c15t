# Svelte consent example

A runnable Inth setup with PostHog, X Pixel, a consent-gated YouTube video,
a persistent preferences control and DevTools. Choose **Default** or **Branded**
to compare the same consent flow with different styling.

From the repository root, install and build workspace packages first:

```sh
bun install
bun run build:libs
```

Replace `https://your-project.inth.app` in `src/App.svelte` with your Inth
backend URL and allow this app's origin in Inth. Replace the placeholder PostHog
project key and X Pixel ID in `src/scripts.ts`. Then run:

```sh
bun run --cwd internals/fixtures/svelte dev
```

PostHog uses `loadMode: 'after-consent'`, so its SDK waits for measurement
permission. X Pixel waits for marketing permission. Revoking permission removes
the YouTube iframe. Removing a vendor script cannot undo code it has already
executed.

Reject, reload, reopen preferences and allow measurement only. The video and
PostHog should load while X Pixel stays blocked. Then allow marketing. Test
revocation and a failed backend request as well. The shared acceptance suite
runs these examples with a fixture backend and intercepted vendor requests:

```sh
EXAMPLE_TARGET=svelte bun run --cwd internals/fixtures/acceptance test
```

This is a test app. The docs quote `examples/svelte` and
`internals/doc-snippets/svelte` instead. The acceptance suite overrides the
backend URL with `VITE_C15T_BACKEND_URL` through `src/test-backend.ts`.
`src/ExamplePage.svelte` and `src/main.ts` hold the demo content, DevTools and
the Branded switch, which loads `src/consent-theme.css`.

## Banner experiment

Open `/?experiment=1` to run the banner-shape experiment: c15t picks the
`control` arm (the default banner) or the `wall` arm, and the page shows
`banner-shape · <arm> · c15t`. Open `/?experiment=1&arm=wall` to set the arm
the way a flag provider would (`assignedBy: host`); any other `arm` value runs
`control`. `src/main.ts` mounts `src/ExperimentApp.svelte` for these URLs, a
copy of `App.svelte` that passes `experiment` and the `onSurfaceShown` and
`onChoiceRecorded` callbacks to the provider. Each impression and choice under
the arm is listed on the page and pushed to `window.dataLayer` as
`c15t_surface_shown` and `c15t_choice_recorded` with `experiment_id` and `arm`.
See https://c15t.com/docs/guides/banner-experiments.

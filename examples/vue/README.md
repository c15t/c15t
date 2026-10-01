# Vue consent example

A runnable Inth setup with PostHog, X Pixel, a consent-gated YouTube video,
a persistent preferences control and DevTools. Choose **Default** or **Branded**
to compare the same consent flow with different styling.

From the repository root, install and build workspace packages first:

```sh
bun install
bun run build:libs
```

Replace `https://your-project.inth.app` in `src/main.ts`, `src/branded.ts`
and `src/headless.ts` with your Inth backend URL, and allow this app's origin
in Inth. Replace the PostHog project key and X Pixel ID placeholders in
`src/scripts.ts` with your own. Then run:

```sh
bun run --cwd examples/vue dev
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
EXAMPLE_TARGET=vue bun run --cwd examples/shared test
```

The files the docs publish are complete recipes:

- `vite.config.ts` adds the c15t Vite plugin.
- `src/main.ts` installs `c15tVue` with the backend URL and `scripts`.
- `src/scripts.ts` holds the vendor configuration.
- `src/App.vue` mounts `ConsentRoot` and `ConsentPreferencesLink`.
- `src/VideoEmbed.vue` gates the YouTube iframe with `ConsentGate`.
- `src/branded.ts` is `main.ts` with tokens, presentation and a slot class.
- `src/headless.ts`, `src/HeadlessApp.vue` and `src/ConsentPrompt.vue` replace
  the stock UI with the composables.

`src/entry.ts` is demo-only: it mounts the branded setup for `?design=branded`,
the headless setup for `/headless`, the experiment setup for `?experiment=1`,
and `main.ts` otherwise. `src/test-backend.ts` lets the acceptance suite
replace the backend URL through `VITE_C15T_BACKEND_URL`; the lines that use it
are left out of the docs. `src/HomePage.vue` holds the demo page content and
loads DevTools in development builds.

## Banner experiment

Open `/?experiment=1` to run the banner-shape experiment: c15t picks the
`control` arm (the default banner) or the `wall` arm, and the page shows
`banner-shape · <arm> · c15t`. Open `/?experiment=1&arm=wall` to set the arm
the way a flag provider would (`assignedBy: host`); any other `arm` value runs
`control`. `src/experiment-main.ts` installs the plugin with the experiment from
`src/experiment.ts`, whose `onSurfaceShown` and `onChoiceRecorded` callbacks
list each impression and choice under the arm as `c15t_surface_shown` and
`c15t_choice_recorded` and push the same events to `window.dataLayer`.
See https://c15t.com/docs/guides/banner-experiments.

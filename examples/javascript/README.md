# JavaScript consent example

Pages built with Vite, no framework:

- `/` starts the stock banner and preferences from `@c15t/browser` with
  `init()`. `/branded/` is the same page with theme tokens.
- `/headless/` renders its own HTML on `createConsentRuntime` from
  `c15t/runtime`. `/headless/?design=branded` restyles it with CSS.
- `/experiment/` is the stock page running a banner experiment. See
  [Banner experiment](#banner-experiment).

All of them register PostHog and X Pixel with `@c15t/integrations`, gate a
YouTube video on measurement and keep a Privacy settings control on the page.

From the repository root, install and build workspace packages first:

```sh
bun install
bun run build:libs
```

Replace `https://your-project.inth.app` in `src/main.ts`, `src/branded.ts`
and `src/consent-runtime.ts` with your Inth backend URL, and allow this app's
origin in Inth. Replace the PostHog project key and X Pixel ID in
`src/scripts.ts`. Then run:

```sh
bun run --cwd examples/javascript dev
```

PostHog uses `loadMode: 'after-consent'`, so its SDK waits for measurement
permission. X Pixel waits for marketing permission. Revoking a permission
reloads the page, so code that already ran is gone.

Reject, reload, reopen preferences and allow measurement only. The video and
PostHog should load while X Pixel stays blocked. Then allow marketing. Test
revocation and a failed backend request as well. The shared acceptance suite
runs both pages with a fixture backend and intercepted vendor requests. It
sets `VITE_C15T_BACKEND_URL`, which `src/test-backend.ts` applies over the
placeholder URL on lines the docs snippets hide:

```sh
EXAMPLE_TARGET=javascript bun run --cwd examples/shared test
```

The docs publish marked regions from `src/main.ts`, `src/branded.ts`,
`src/consent-runtime.ts`, `src/headless.ts`, `src/scripts.ts`,
`src/kernel.ts` and the `src/ref-*.ts` files. No page imports `kernel.ts` or
the `ref-*.ts` files; they hold reference setups for the transports, modules,
callbacks and translations pages, and `bun run check-types` compiles them.
DevTools mounts only in development.

## Banner experiment

Open `/experiment/` to run the banner-shape experiment: c15t picks the
`control` arm (the default banner) or the `wall` arm, and the page shows
`banner-shape · <arm> · c15t` with a `c15t_surface_shown` and
`c15t_choice_recorded` line for each impression and choice under the arm.
Open `/experiment/?arm=wall` to set the arm the way a flag provider would
(`assignedBy: host`); any other `arm` value runs `control`.
`src/experiment.ts` passes the experiment to `init()` and logs the
`onSurfaceShown` and `onChoiceRecorded` callbacks to the page and to
`window.dataLayer`. See https://c15t.com/docs/guides/banner-experiments.

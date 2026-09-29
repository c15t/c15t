# Vue consent example

A runnable Inth setup with PostHog, X Pixel, a consent-gated YouTube video,
a persistent preferences control and DevTools. Choose **Default** or **Branded**
to compare the same consent flow with different styling.

From the repository root, install and build workspace packages first:

```sh
bun install
bun run build:libs
```

Copy `.env.example` to `.env.local` in this directory. Set
`VITE_C15T_BACKEND_URL` to your Inth endpoint and allow this app's origin in
Inth. The URL is public. Set the PostHog project key and X Pixel ID to enable
the corresponding integration; unset IDs leave those scripts unregistered.
Then run:

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

`src/scripts.ts` contains the vendor configuration. Framework setup stays in
this example's source files so documentation can use the same code.

## Banner experiment

Open `/?experiment=1` to run the banner-shape experiment: c15t assigns the
`floating` or `wall` arm and the page shows `banner-shape · <arm> · c15t` with
the `c15t_surface_shown` and `c15t_choice_recorded` events it reported. Open
`/?experiment=1&arm=wall` to force the arm the way a flag provider would
(`assignedBy: host`). Both push the same events to `window.dataLayer`.
See https://c15t.com/docs/guides/banner-experiments.

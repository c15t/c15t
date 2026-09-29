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
the headless setup for `/headless`, and `main.ts` otherwise. `src/HomePage.vue`
holds the demo page content and loads DevTools in development builds.

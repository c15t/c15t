# React consent example

A runnable Inth setup with PostHog, X Pixel, a consent-gated YouTube video,
a persistent preferences control and DevTools in development. Choose **Default** or **Branded**
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
bun run --cwd examples/react dev
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
EXAMPLE_TARGET=react bun run --cwd examples/shared test
```

`src/consent.tsx`, `src/main.tsx` and `src/scripts.ts` hold the setup the docs
publish. `src/app.tsx` is the demo page: status, gated video, design switch and
DevTools in development.

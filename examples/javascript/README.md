# JavaScript consent example

Two pages built with Vite, no framework:

- `/` starts the stock banner and preferences from `@c15t/browser` with
  `init()`. `/branded/` is the same page with theme tokens.
- `/headless/` renders its own HTML on `createConsentRuntime` from
  `c15t/runtime`. `/headless/?design=branded` restyles it with CSS.

Both register PostHog and X Pixel with `@c15t/scripts`, gate a YouTube video
on measurement and keep a Privacy settings control on the page.

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
bun run --cwd examples/javascript dev
```

PostHog uses `loadMode: 'after-consent'`, so its SDK waits for measurement
permission. X Pixel waits for marketing permission. Revoking a permission
reloads the page, so code that already ran is gone.

Reject, reload, reopen preferences and allow measurement only. The video and
PostHog should load while X Pixel stays blocked. Then allow marketing. Test
revocation and a failed backend request as well. The shared acceptance suite
runs both pages with a fixture backend and intercepted vendor requests:

```sh
EXAMPLE_TARGET=javascript bun run --cwd examples/shared test
```

The docs publish marked regions from `src/main.ts`, `src/branded.ts`,
`src/consent-runtime.ts`, `src/headless.ts`, `src/scripts.ts`,
`src/kernel.ts` and the `src/ref-*.ts` files. No page imports `kernel.ts` or
the `ref-*.ts` files; they hold reference setups for the transports, modules,
callbacks and translations pages, and `bun run check-types` compiles them.
DevTools mounts only in development.

# JavaScript (Vite)

The smallest c15t setup for a JavaScript app with a bundler and no UI
framework: `init()` from `@c15t/browser` mounts the stock consent banner and
dialog, a "Privacy settings" button reopens the dialog, and PostHog loads only
after the visitor allows measurement. The build bundles your project's
policy, and the browser resolves each visitor from it.

- `vite.config.ts` adds `consentManifest` from `c15t/build`, which downloads
  the policy and serves it as `c15t/generated`.
- `src/main.ts` calls `init()` with the bundled policy and wires the button.
- `src/scripts.ts` registers PostHog.
- `index.html` holds the button.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/javascript dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. `vite dev` and `vite build` download its policy when they start. If
the download fails, `vite build` stops with an error, and `vite dev` logs a
warning and the browser fetches the policy at runtime. To use your own project,
set `VITE_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
app's origin to its trusted origins.

Rebuild after you change the policy, translations or vendors in your project.

Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

The [JavaScript quickstart](https://c15t.com/docs/frameworks/javascript/quickstart)
walks through each file.

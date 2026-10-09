# Svelte

c15t in a Svelte 5 app built with Vite. The build bundles your project's
policy, the browser resolves consent from it after the page loads, then shows
the stock banner. A "Privacy settings" link in the footer reopens the
preference dialog, and PostHog loads only after the visitor allows
measurement.

- `vite.config.ts` downloads the policy with `consentManifest` into
  `src/c15t-manifest.ts`, which Git ignores.
- `src/App.svelte` mounts `ConsentManagerProvider` in `manifest()` mode with
  the banner, dialog and link.
- `src/scripts.ts` registers PostHog.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/svelte dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. `vite dev` and `vite build` download its policy when they start. If
the download fails, `vite build` stops with an error, and `vite dev` logs a
warning and the browser fetches the policy at runtime. To use your own project,
set `VITE_C15T_BACKEND_URL` in `.env.local` to its backend URL and add
`http://127.0.0.1:5173` to its trusted origins.

Rebuild after you change the policy, translations or vendors in your project,
or the backend URL. Replace `phc_your_project_key` in `src/scripts.ts` with
your PostHog project key.

Docs: [Svelte quickstart](https://c15t.com/docs/frameworks/svelte/quickstart)

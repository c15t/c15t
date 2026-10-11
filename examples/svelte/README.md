# Svelte

c15t in a Svelte 5 app built with Vite. After the page loads, the browser
asks your Inth project's `/init` for the visitor's policy, then shows the
stock banner. A "Privacy settings" link in the footer reopens the
preference dialog, and PostHog loads only after the visitor allows
measurement.

- `vite.config.ts` adds `consentManifest`, which hands the backend URL to
  the app.
- `src/App.svelte` mounts `ConsentProvider` in `hosted()` mode, with
  PostHog, the banner, dialog and link.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/svelte dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. The browser asks it for each visitor's policy on every page load, so
policy edits in the project apply without a rebuild. To use your own project,
set `VITE_C15T_BACKEND_URL` in `.env.local` to its backend URL and add
`http://127.0.0.1:5173` to its trusted origins.

Rebuild after you change the backend URL. Replace `phc_your_project_key` in `src/App.svelte` with
your PostHog project key.

Docs: [Svelte quickstart](https://c15t.com/docs/frameworks/svelte/quickstart)

# Vue starter

The smallest c15t setup for a Vue 3 single-page app built with Vite. The
browser asks your Inth project's `/init` for each visitor's policy, and the
backend picks it from the visitor's location. The build runs on any static
host.

- `vite.config.ts` adds `consentManifest()` next to `@vitejs/plugin-vue`. It
  hands the backend URL to the app and keeps c15t's `.vue` components out of
  Vite's pre-bundling.
- `src/main.ts` installs `c15tVue` with `hosted()` and loads PostHog once the
  visitor allows measurement.
- `src/App.vue` mounts `ConsentRoot` for the banner and dialog, and a Privacy
  settings link that reopens the dialog.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/vue dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. The browser asks it for each visitor's policy on every page load, so
policy edits in the project apply without a rebuild. To use your own project,
set `VITE_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
app's origin to its trusted origins.

Vite writes the backend URL into the bundle, so rebuild after changing it.

Replace `phc_your_project_key` in `src/main.ts` with your PostHog project key.

The [Vue quickstart](https://c15t.com/docs/frameworks/vue/quickstart) walks
through each file.

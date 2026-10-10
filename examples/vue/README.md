# Vue starter

The smallest c15t setup for a Vue 3 single-page app built with Vite. The build
bundles your project's policy, and the browser resolves it without asking the
backend, so the build runs on any static host.

- `vite.config.ts` adds `consentManifest()` next to `@vitejs/plugin-vue`. It
  downloads the policy when Vite starts.
- `src/main.ts` installs `c15tVue` with `manifest()`, which reads that policy,
  and loads PostHog once the visitor allows measurement.
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
project. `vite dev` and `vite build` download its policy when they start. If
the download fails, `vite build` stops with an error, and `vite dev` logs a
warning and the browser fetches the policy at runtime. To use your own project,
set `VITE_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
app's origin to its trusted origins.

The browser does not know the visitor's location, so every visitor gets the
policy your project uses when the location is unknown. Rebuild after you
change the policy, translations or vendors in your project.

Replace `phc_your_project_key` in `src/main.ts` with your PostHog project key.

The [Vue quickstart](https://c15t.com/docs/frameworks/vue/quickstart) walks
through each file.

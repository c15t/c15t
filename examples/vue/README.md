# Vue starter

The smallest c15t setup for a Vue 3 single-page app built with Vite. The
browser asks your backend for the visitor's policy after the page loads, so
the build runs on any static host.

- `vite.config.ts` adds the c15t Vite plugin next to `@vitejs/plugin-vue`.
- `src/main.ts` installs `c15tVue` with the backend URL and `scripts`.
- `src/scripts.ts` loads PostHog once the visitor allows measurement.
- `src/App.vue` mounts `ConsentRoot` for the banner and dialog, and a
  Privacy settings link that reopens the dialog.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/vue dev
```

Replace `https://your-project.inth.app` in `src/main.ts` with your project's
backend URL, and add the app's origin to the project's trusted origins.
Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

The [Vue quickstart](https://c15t.com/docs/frameworks/vue/quickstart) walks
through each file.

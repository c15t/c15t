# Vue starter

The smallest c15t setup for a Vue 3 single-page app built with Vite. The build
bundles your project's policy, and the browser resolves it without asking the
backend, so the build runs on any static host.

- `vite.config.ts` adds the c15t Vite plugin next to `@vitejs/plugin-vue`, and
  `consentManifest`, which downloads the policy and writes
  `src/c15t-manifest.ts`.
- `src/main.ts` installs `c15tVue` with the backend URL, the bundled policy
  and `scripts`.
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

The app talks to the `https://benchmarks-inth.inth.app` demo Inth project.
`vite dev` and `vite build` download its policy when they start, and stop if
they can't. To use your own project, set `VITE_C15T_BACKEND_URL` to its
backend URL and add the app's origin to its trusted origins:

```sh
VITE_C15T_BACKEND_URL=https://your-project.inth.app \
	bun run --cwd examples/vue dev
```

The browser does not know the visitor's location, so every visitor gets the
policy your project uses when the location is unknown. Rebuild after you
change the policy, translations or vendors in your project.

Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

The [Vue quickstart](https://c15t.com/docs/frameworks/vue/quickstart) walks
through each file.

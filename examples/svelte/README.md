# Svelte

c15t in a Svelte 5 app built with Vite. The browser resolves consent after the
page loads, then shows the stock banner. A "Privacy settings" link in the
footer reopens the preference dialog, and PostHog loads only after the visitor
allows measurement.

- `src/App.svelte` mounts `ConsentManagerProvider` with the banner, dialog and
  link.
- `src/scripts.ts` registers PostHog.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/svelte dev
```

Replace `https://your-project.inth.app` in `src/App.svelte` with your
project's backend URL, and add `http://127.0.0.1:5173` to the project's trusted
origins. Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog
project key.

Docs: [Svelte quickstart](https://c15t.com/docs/frameworks/svelte/quickstart)

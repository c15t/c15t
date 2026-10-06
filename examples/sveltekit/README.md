# SvelteKit

c15t in a server-rendered SvelteKit app. The root layout's server load resolves
each visitor's consent, so the banner is in the first HTML and a returning
visitor's choice applies from the first paint. A "Privacy settings" link in the
footer reopens the preference dialog, and PostHog loads only after the visitor
allows measurement.

- `src/routes/+layout.server.ts` resolves consent with `loadConsent`.
- `src/routes/+layout.svelte` renders `ConsentManagerProvider` with the banner,
  dialog and link.
- `src/hooks.server.ts` reads the request's consent context once with
  `c15tHandle`.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app \
	bun run --cwd examples/sveltekit dev
```

Use your project's backend URL, and add `http://localhost:5173` to the
project's trusted origins. `src/env.ts` falls back to
`https://your-project.inth.app` when the variable is unset. Replace
`phc_your_project_key` in `src/lib/scripts.ts` with your PostHog project key.

Docs: [SvelteKit quickstart](https://c15t.com/docs/frameworks/sveltekit/quickstart)

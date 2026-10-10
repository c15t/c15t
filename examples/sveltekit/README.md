# SvelteKit

c15t in a server-rendered SvelteKit app. The build bundles your project's
policy into the server, and the root layout's server load resolves each
visitor's consent from it, so the banner is in the first HTML and a returning
visitor's choice applies from the first paint. A "Privacy settings" link in the
footer reopens the preference dialog, and PostHog loads only after the visitor
allows measurement.

- `vite.config.ts` downloads the policy with `consentManifest`. Only server
  code gets it; the browser bundle never does.
- `src/hooks.server.ts` reads the request's consent context once with
  `c15tHandle`.
- `src/routes/+layout.server.ts` resolves consent with `loadConsent`.
- `src/routes/+layout.svelte` renders `ConsentRoot` with PostHog, the banner,
  dialog and link.
- `src/app.d.ts` types `event.locals.c15t`.

A prerendered page carries no visitor's consent, so the browser resolves it.
To do that through the app's own origin, add
`src/routes/api/c15t/[...path]/+server.ts` with
`export const { GET } = createConsentRoute();` and pass
`c15tHandle({ routePrefix: '/api/c15t' })`.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/sveltekit dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. `vite dev`, `vite build` and `svelte-kit sync` download its policy
when they start. If the download fails, `vite build` stops with an error, and
`vite dev` logs a warning and the server fetches the policy at runtime. To use
your own project, set `PUBLIC_C15T_BACKEND_URL` in `.env.local` to its backend
URL and add `http://localhost:5173` to its trusted origins.

Rebuild after you change the policy, translations or vendors in your project,
or the backend URL. Replace `phc_your_project_key` in `src/routes/+layout.svelte` with
your PostHog project key.

Docs: [SvelteKit quickstart](https://c15t.com/docs/frameworks/sveltekit/quickstart)

# TanStack Start

The smallest c15t setup for a server-rendered TanStack Start app. The root
loader resolves consent on the server, so the banner is part of the first
HTML. PostHog loads only after the visitor allows measurement, and a
"Privacy settings" link reopens the dialog.

- `src/start.ts` registers `consentRequestMiddleware()`, which reads the
  location, language and Global Privacy Control headers on every request.
- `src/routes/__root.tsx` resolves consent in a server function, mounts
  `ConsentRoot` with the banner and dialog, and loads the stylesheet.
- `src/scripts.ts` registers PostHog.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/tanstack-start dev
```

Set `VITE_C15T_BACKEND_URL` to your project's backend URL, or replace the
`https://your-project.inth.app` fallback in `src/routes/__root.tsx`. Add the
app's origin to the project's trusted origins, and replace
`phc_your_project_key` in `src/scripts.ts` with your PostHog project key.

`bun run build` then `bun run start` serves the production build.

The [TanStack Start quickstart](https://c15t.com/docs/frameworks/tanstack-start/quickstart)
walks through each file. [Rendering](https://c15t.com/docs/frameworks/tanstack-start/rendering)
covers streaming, a same-origin consent route and static hosting.

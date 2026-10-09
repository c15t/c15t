# TanStack Start

The smallest c15t setup for a server-rendered TanStack Start app. The build
bundles your project's policy into the server, and the root loader resolves
each visitor from it, so the banner is part of the first HTML. PostHog loads
only after the visitor allows measurement, and a "Privacy settings" link
reopens the dialog.

- `vite.config.ts` adds the `consentManifest` plugin, which downloads the
  policy into `src/c15t-manifest.ts` when `vite dev` or `vite build` starts.
- `src/consent-options.server.ts` pairs the backend URL with that manifest.
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

The app talks to the `https://benchmarks-inth.inth.app` demo Inth project.
`vite dev` and `vite build` download its policy when they start. If they
can't, they log a warning and the server fetches the policy at runtime.
To use your own project, set `VITE_C15T_BACKEND_URL` to its backend URL and
add the app's origin to its trusted origins:

```sh
VITE_C15T_BACKEND_URL=https://your-project.inth.app \
	bun run --cwd examples/tanstack-start dev
```

Rebuild after you change the policy, translations or vendors in your project.

Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

`bun run build` then `bun run start` serves the production build.

The [TanStack Start quickstart](https://c15t.com/docs/frameworks/tanstack-start/quickstart)
walks through each file. [Rendering](https://c15t.com/docs/frameworks/tanstack-start/rendering)
covers streaming, a same-origin consent route and static hosting.

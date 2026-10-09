# TanStack Start

The smallest c15t setup for a server-rendered TanStack Start app. The build
bundles your project's policy into the server, and the root loader resolves
each visitor from it, so the banner is part of the first HTML. PostHog loads
only after the visitor allows measurement, and a "Privacy settings" link
reopens the dialog.

- `vite.config.ts` adds the `consentManifest` plugin, which downloads the
  policy into `src/c15t-manifest.ts` when `vite dev` or `vite build` starts,
  and passes the backend URL to the app as `VITE_C15T_BACKEND_URL`.
- `src/routes/__root.tsx` resolves consent in a server function from that
  manifest and the request's location, language and Global Privacy Control
  headers, then mounts `ConsentRoot` with the banner and dialog.
- `src/scripts.ts` registers PostHog.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/tanstack-start dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. `vite dev` and `vite build` download its policy when they start. If
the download fails, `vite build` stops with an error, and `vite dev` logs a
warning and the server fetches the policy at runtime. To use your own project,
set `VITE_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
app's origin to its trusted origins.

Rebuild after you change the policy, translations or vendors in your project.

Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

`bun run build` then `bun run start` serves the production build.

The [TanStack Start quickstart](https://c15t.com/docs/frameworks/tanstack-start/quickstart)
walks through each file. [Rendering](https://c15t.com/docs/frameworks/tanstack-start/rendering)
covers streaming, a same-origin consent route and static hosting.

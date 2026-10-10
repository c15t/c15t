# Next.js App Router

c15t in a server-rendered Next.js App Router app. The build bundles your
project's policy into the server, and the server resolves consent for each
visitor from it, so the browser makes no `/init` request. PostHog loads only
after the visitor allows measurement.

## Files

- `.env` sets `NEXT_PUBLIC_C15T_BACKEND_URL` to the demo project. The build,
  the server and the browser read it.
- `next.config.ts` wraps the config in `withConsentManifest`, which writes the
  policy to `node_modules/.cache/c15t/` during `next build` and `next dev`,
  and finds `c15t.config.ts`.
- `c15t.config.ts` loads PostHog after the visitor allows measurement.
  `ConsentRoot` and `resolveConsent` read it without importing it.
- `app/layout.tsx` starts `resolveConsent()` without awaiting it and renders
  `ConsentRoot`, the banner, the dialog and a Privacy settings link.

## Run

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nextjs dev
```

Open `http://localhost:3100`. The app's `.env` points it at the
`https://example-inth.inth.app` demo Inth project. `next dev` and
`next build` download its policy when they start. If the download fails,
`next build` stops with an error, and `next dev` logs a warning and the server
fetches the policy at runtime.

To use your own project, set `NEXT_PUBLIC_C15T_BACKEND_URL` in `.env.local` to
its backend URL, and add the app's origin to its trusted origins. Rebuild after
you change the policy, translations or vendors in your project. Replace
`phc_your_project_key` in `c15t.config.ts` with your PostHog project key.

The [Next.js quickstart](https://c15t.com/docs/frameworks/next/quickstart)
walks through these files.

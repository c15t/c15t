# Next.js Pages Router

c15t in a Next.js Pages Router app. The build bundles your project's policy
into the server, and the page resolves consent from it in
`getServerSideProps`, so the banner is in the server HTML and the browser makes
no `/init` request. PostHog loads only after the visitor allows measurement.

## Files

- `c15t.config.ts` holds the backend URL and the manifest route's path.
- `next.config.ts` wraps the config in `withConsentManifest`, which writes the
  policy to `node_modules/.cache/c15t/` during `next build` and `next dev`
  and serves it to server code as `c15t/generated`.
- `c15t.server.ts` pairs the config with that policy for server code.
- `pages/api/c15t/manifest.ts` serves the bundled policy.
- `pages/_app.tsx` mounts the client wrapper from `components/consent.tsx`
  with the state a page resolved on the server.
- `pages/index.tsx` resolves consent in `getServerSideProps`.

## Run

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nextjs-pages-router dev
```

Open `http://localhost:3101`. The app's `.env` points it at the
`https://example-inth.inth.app` demo Inth project. `next dev` and
`next build` download its policy when they start. If the download fails,
`next build` stops with an error, and `next dev` logs a warning and the server
fetches the policy at runtime.

To use your own project, set `NEXT_PUBLIC_C15T_BACKEND_URL` in `.env.local` to
its backend URL, and add the app's origin to its trusted origins. Rebuild after
you change the policy, translations or vendors in your project. Replace
`phc_your_project_key` in `lib/scripts.ts` with your PostHog project key.

The [Pages Router guide](https://c15t.com/docs/frameworks/next/pages-router)
walks through these files.

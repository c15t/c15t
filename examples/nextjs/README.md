# Next.js App Router

c15t in a server-rendered Next.js App Router app. The build bundles your
project's policy into the server, and the server resolves consent for each
visitor from it, so the browser makes no `/init` request. PostHog loads only
after the visitor allows measurement.

## Files

- `c15t.config.ts` holds the backend URL and the manifest route's path.
- `next.config.ts` wraps the config in `withConsentManifest`, which writes the
  policy to `c15t-manifest.ts` during `next build` and `next dev`.
- `c15t.server.ts` pairs the config with that policy for server code.
- `app/api/c15t/manifest/route.ts` serves the bundled policy.
- `components/consent.tsx` is the client wrapper: `ConsentRoot`, the banner,
  the dialog and a Privacy settings link.
- `app/layout.tsx` starts `resolveConsent` without awaiting it and passes the
  result to the wrapper.

## Run

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nextjs dev
```

Open `http://localhost:3100`. The app talks to the
`https://benchmarks-inth.inth.app` demo Inth project. `next dev` and
`next build` download its policy when they start, and stop if they can't.

To use your own project, set `NEXT_PUBLIC_C15T_BACKEND_URL` in `.env.local` to
its backend URL, and add the app's origin to its trusted origins. Rebuild after
you change the policy, translations or vendors in your project. Replace
`phc_your_project_key` in `lib/scripts.ts` with your PostHog project key.

The [Next.js quickstart](https://c15t.com/docs/frameworks/next/quickstart)
walks through these files.

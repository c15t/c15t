# Next.js Pages Router

c15t in a Next.js Pages Router app. The page resolves consent in
`getServerSideProps` from a cached policy manifest, so the banner is in the
server HTML and the browser makes no `/init` request. PostHog loads only after
the visitor allows measurement.

## Files

- `c15t.config.ts` holds the backend URL and the manifest route's path.
- `pages/api/c15t/manifest.ts` serves the cached policy manifest.
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

Open `http://localhost:3101`. Set `NEXT_PUBLIC_C15T_BACKEND_URL` in
`.env.local` to your project's backend URL, and add the app's origin to the
project's trusted origins. Replace `phc_your_project_key` in `lib/scripts.ts`
with your PostHog project key.

The [Pages Router guide](https://c15t.com/docs/frameworks/next/pages-router)
walks through these files.

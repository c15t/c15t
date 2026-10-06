# Next.js App Router

c15t in a server-rendered Next.js App Router app. The server caches your
project's policy manifest and resolves consent for each visitor, so the browser
makes no `/init` request. PostHog loads only after the visitor allows
measurement.

## Files

- `c15t.config.ts` holds the backend URL and the manifest route's path.
- `app/api/c15t/manifest/route.ts` serves the cached policy manifest.
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

Open `http://localhost:3100`. Set `NEXT_PUBLIC_C15T_BACKEND_URL` in
`.env.local` to your project's backend URL, and add the app's origin to the
project's trusted origins. Replace `phc_your_project_key` in `lib/scripts.ts`
with your PostHog project key.

The [Next.js quickstart](https://c15t.com/docs/frameworks/next/quickstart)
walks through these files.

# React (Vite)

The smallest c15t setup for a client-rendered React app built with Vite: the
stock consent banner and dialog, a "Privacy settings" link, and PostHog loaded
only after the visitor allows measurement. The browser asks your Inth
project's `/init` for each visitor's policy, and the backend picks it from the
visitor's location.

- `vite.config.ts` adds `consentManifest`, which hands the backend URL to
  the app through `c15t/generated`.
- `src/consent.tsx` mounts `ConsentProvider` in `hosted()` mode, with
  PostHog, the banner and the dialog.
- `src/main.tsx` wraps the app in `Consent`.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/react dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. The browser asks it for each visitor's policy on every page load, so
policy edits in the project apply without a rebuild. To use your own project,
set `VITE_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
app's origin to its trusted origins.

Vite writes the backend URL into the bundle, so rebuild after changing it.

Replace `phc_your_project_key` in `src/consent.tsx` with your PostHog project
key.

The [React quickstart](https://c15t.com/docs/frameworks/react/quickstart)
walks through each file.

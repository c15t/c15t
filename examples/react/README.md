# React (Vite)

The smallest c15t setup for a client-rendered React app built with Vite: the
stock consent banner and dialog, a "Privacy settings" link, and PostHog loaded
only after the visitor allows measurement. The build bundles your project's
policy, and the browser resolves each visitor from it.

- `vite.config.ts` adds `consentManifest`, which downloads the policy and
  writes `src/c15t-manifest.ts`.
- `src/consent.tsx` mounts `ConsentProvider` with the bundled policy, the
  banner and the dialog.
- `src/scripts.ts` registers PostHog.
- `src/main.tsx` wraps the app in `Consent`.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/react dev
```

The app talks to the `https://benchmarks-inth.inth.app` demo Inth project.
`vite dev` and `vite build` download its policy when they start, and stop if
they can't. To use your own project, set `VITE_C15T_BACKEND_URL` to its
backend URL and add the app's origin to its trusted origins:

```sh
VITE_C15T_BACKEND_URL=https://your-project.inth.app \
	bun run --cwd examples/react dev
```

Rebuild after you change the policy, translations or vendors in your project.

Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

The [React quickstart](https://c15t.com/docs/frameworks/react/quickstart)
walks through each file.

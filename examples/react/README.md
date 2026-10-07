# React (Vite)

The smallest c15t setup for a client-rendered React app built with Vite: the
stock consent banner and dialog, a "Privacy settings" link, and PostHog loaded
only after the visitor allows measurement.

- `src/consent.tsx` mounts `ConsentProvider` with your backend URL, the banner
  and the dialog.
- `src/scripts.ts` registers PostHog.
- `src/main.tsx` wraps the app in `Consent`.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/react dev
```

Replace `https://your-project.inth.app` in `src/consent.tsx` with your
project's backend URL, add the app's origin to the project's trusted origins,
and replace `phc_your_project_key` in `src/scripts.ts` with your PostHog
project key.

The [React quickstart](https://c15t.com/docs/frameworks/react/quickstart)
walks through each file.

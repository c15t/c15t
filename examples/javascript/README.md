# JavaScript (Vite)

The smallest c15t setup for a JavaScript app with a bundler and no UI
framework: `init()` from `@c15t/browser` mounts the stock consent banner and
dialog, a "Privacy settings" button reopens the dialog, and PostHog loads only
after the visitor allows measurement.

- `src/main.ts` calls `init()` with your backend URL and wires the button.
- `src/scripts.ts` registers PostHog.
- `index.html` holds the button.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/javascript dev
```

Replace `https://your-project.inth.app` in `src/main.ts` with your project's
backend URL, add the app's origin to the project's trusted origins, and
replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

The [JavaScript quickstart](https://c15t.com/docs/frameworks/javascript/quickstart)
walks through each file.

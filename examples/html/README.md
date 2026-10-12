# HTML (script tag)

The smallest c15t setup for a site without a build step: one script tag loads
`@c15t/browser` from jsDelivr with the stock consent banner and dialog,
PostHog waits for measurement consent as an inert `text/plain` tag, and a
"Privacy settings" link reopens the dialog.

- `index.html` holds the c15t tag, the gated PostHog tag and the link.
- `posthog.js` is PostHog's snippet, saved as a file the page runs after
  consent.
- `serve.ts` serves the folder locally, because cookies need an http origin.

## Run it

From the repository root:

```sh
bun install
bun run --cwd examples/html dev
```

Replace `https://your-project.inth.app` in `index.html` with your project's
backend URL, add `http://localhost:4173` to the project's trusted origins, and
replace `phc_your_project_key` in `posthog.js` with your PostHog project key.

The [HTML quickstart](https://c15t.com/docs/frameworks/html/quickstart) walks
through each part.

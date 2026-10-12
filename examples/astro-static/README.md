# Astro static starter

An Astro site with static output and no adapter, using the `c15t/astro`
integration in `hosted()` mode. Every page is built once. In the browser, c15t
asks your backend whether to show the banner, and PostHog loads once the
visitor allows measurement.

- `astro.config.mjs` registers the integration.
- `src/c15t.client.ts` lists the consent-gated scripts. The integration finds
  it on its own.
- `src/layouts/base.astro` renders the banner, the dialog and the
  "Privacy settings" link.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/astro-static dev
```

The site's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. To use your own project, set `PUBLIC_C15T_BACKEND_URL` in
`.env.local` to its backend URL and add the site's origin to its trusted
origins. The build bakes the URL into the pages, so rebuild after you change
it. `bun run --cwd examples/astro-static build` writes the site to `dist/`.

Replace `phc_your_project_key` in `src/c15t.client.ts` with your PostHog
project key.

For server-rendered pages, see [`examples/astro`](../astro). The
[Astro rendering guide](https://c15t.com/docs/frameworks/astro/rendering)
compares the two.

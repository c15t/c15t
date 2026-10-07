# Astro static starter

An Astro site with static output and no adapter, using the `c15t/astro`
integration in `hosted()` mode. Every page is built once. In the browser, c15t
asks your backend whether to show the banner, and PostHog loads once the
visitor allows measurement.

- `astro.config.mjs` registers the integration and the backend URL.
- `src/scripts.ts` lists the consent-gated scripts, and
  `src/consent-client.ts` hands them to the browser.
- `src/layouts/base.astro` renders the banner, the dialog and the
  "Privacy settings" link.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/astro-static dev
```

Replace `https://your-project.inth.app` in `astro.config.mjs` with your
project's backend URL, and add the site's origin to the project's trusted
origins. `bun run --cwd examples/astro-static build` writes the site to `dist/`.

For server-rendered pages, see [`examples/astro`](../astro). The
[Astro rendering guide](https://c15t.com/docs/frameworks/astro/rendering)
compares the two.

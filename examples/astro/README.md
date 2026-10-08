# Astro starter

An Astro site with server output, the Node adapter and the `c15t/astro`
integration in `manifest()` mode with `buildManifest: true`. The build bundles
your project's policy into the server, and the server resolves each visitor
from it, so the banner is in the first HTML. PostHog loads once the visitor
allows measurement.

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
bun run --cwd examples/astro dev
```

The site talks to the `https://benchmarks-inth.inth.app` demo Inth project.
`astro dev` and `astro build` download its policy when they start, and stop if
they can't. To use your own project, set `PUBLIC_C15T_BACKEND_URL` to its
backend URL and add the site's origin to its trusted origins:

```sh
PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app \
	bun run --cwd examples/astro dev
```

The config reads the URL when it loads, so set it for `build` as well as
`dev`. The built server keeps the URL and the policy from build time, so
rebuild after you change the URL or your project's policies, translations or
vendors.

Replace `phc_your_project_key` in `src/scripts.ts` with your PostHog project
key.

For a site with no server, see [`examples/astro-static`](../astro-static).
The [Astro quickstart](https://c15t.com/docs/frameworks/astro/quickstart)
walks through each file.

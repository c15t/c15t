# Astro starter

An Astro site with server output, the Node adapter and the `c15t/astro`
integration in its default `manifest()` mode. The build bundles your
project's policy into the server, and the server resolves each visitor from
it, so the banner is in the first HTML. PostHog loads once the visitor allows
measurement.

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
bun run --cwd examples/astro dev
```

The site's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. `astro dev` and `astro build` download its policy when they start. If
the download fails, `astro build` stops with an error, and `astro dev` logs a
warning and the server fetches the policy at runtime. To use your own project,
set `PUBLIC_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
site's origin to its trusted origins.

The config reads the URL when it loads, so set it for `build` as well as
`dev`. The built server keeps the URL and the policy from build time, so
rebuild after you change the URL or your project's policies, translations or
vendors.

Replace `phc_your_project_key` in `src/c15t.client.ts` with your PostHog
project key.

For a site with no server, see [`examples/astro-static`](../astro-static).
The [Astro quickstart](https://c15t.com/docs/frameworks/astro/quickstart)
walks through each file.

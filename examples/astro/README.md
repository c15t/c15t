# Astro starter

An Astro site with server output, the Node adapter and the `c15t/astro`
integration in `manifest()` mode. The banner is rendered on the server, so it
is in the first HTML, and PostHog loads once the visitor allows measurement.

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
PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app bun run --cwd examples/astro dev
```

Set `PUBLIC_C15T_BACKEND_URL` to your project's backend URL, and add the site's
origin to the project's trusted origins. The integration reads the URL when
the config loads, so set it for `build` as well as `dev`.

For a site with no server, see [`examples/astro-static`](../astro-static).
The [Astro quickstart](https://c15t.com/docs/frameworks/astro/quickstart)
walks through each file.

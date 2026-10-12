# c15t with Nuxt on static hosting

c15t in a single-page Nuxt app (`ssr: false`) built with `nuxt generate`, for
a host that serves files only. The build bundles your project's policy, and
the browser resolves it without asking the backend. PostHog loads once the
visitor allows measurement.

- `nuxt.config.ts` registers the `c15t/vue` module with
  `mode: manifest({ resolve: 'browser' })` and `routePrefix: false`, since a
  static host has no server for the consent route.
- `app/app.config.ts` loads PostHog once the visitor allows measurement.
- `app/app.vue` mounts `ConsentRoot` and a Privacy settings link.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nuxt-static dev
```

`bun run --cwd examples/nuxt-static build` writes the site to
`.output/public`, and `bun run --cwd examples/nuxt-static start` serves it.

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project, and the build downloads its policy. To use your own project, set
`NUXT_PUBLIC_C15T_BACKEND_URL` in `.env.local` to its backend URL and add the
app's origin to its trusted origins. Rebuild after you change the policy,
translations or vendors in your project. Replace `phc_your_project_key` with
your PostHog project key.

The browser does not know the visitor's location, so every visitor gets the
policy your project uses when the location is unknown.

See [build a single-page app with ssr: false](https://c15t.com/docs/frameworks/nuxt/rendering#build-a-single-page-app-with-ssr-false).

# c15t with Nuxt on static hosting

c15t in a single-page Nuxt app (`ssr: false`) built with `nuxt generate`, for
a host that serves files only. The browser downloads the policy manifest from
the backend and shows the banner once it loads. PostHog loads once the visitor
allows measurement.

- `nuxt.config.ts` registers the `c15t/vue` module with `manifest: 'client'`
  and `manifestURL`.
- `app/app.vue` mounts `ConsentRoot` and a Privacy settings link.
- `app/consent-scripts.ts` declares PostHog, and `app/app.config.ts` registers
  it.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nuxt-static dev
```

`bun run --cwd examples/nuxt-static build` writes the site to
`.output/public`, and `bun run --cwd examples/nuxt-static start` serves it.

Replace `https://your-project.inth.app` in `nuxt.config.ts` with your
project's backend URL, in both `backendURL` and `manifestURL`, and add the
app's origin to the project's trusted origins. Replace `phc_your_project_key`
with your PostHog project key.

See [build a single-page app with ssr: false](https://c15t.com/docs/frameworks/nuxt/rendering#build-a-single-page-app-with-ssr-false).

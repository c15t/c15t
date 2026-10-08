# c15t with Nuxt

The smallest c15t setup for a server-rendered Nuxt app. The build bundles your
project's policy into the server, and the server resolves each visitor from
it, so the banner is part of the first HTML. PostHog loads once the visitor
allows measurement.

- `nuxt.config.ts` registers the `c15t/vue` module with `buildManifest: true`.
- `app/app.vue` mounts `ConsentRoot` and a Privacy settings link.
- `app/consent-scripts.ts` declares PostHog, and `app/app.config.ts` registers
  it.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nuxt dev
```

The app talks to the `https://benchmarks-inth.inth.app` demo Inth project.
`nuxt dev` and `nuxt build` download its policy when they start, and stop if
they can't. To use your own project, set `NUXT_PUBLIC_C15T_BACKEND_URL` to its
backend URL and add the app's origin to its trusted origins:

```sh
NUXT_PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app \
	bun run --cwd examples/nuxt dev
```

Rebuild after you change the policy, translations or vendors in your project.

Replace `phc_your_project_key` with your PostHog project key.

See the [Nuxt quickstart](https://c15t.com/docs/frameworks/nuxt/quickstart).

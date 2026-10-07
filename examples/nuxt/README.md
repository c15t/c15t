# c15t with Nuxt

The smallest c15t setup for a server-rendered Nuxt app. The server resolves
each visitor's policy from a cached manifest, so the banner is part of the
first HTML. PostHog loads once the visitor allows measurement.

- `nuxt.config.ts` registers the `c15t/vue` module with `manifest: 'server'`.
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

Replace `https://your-project.inth.app` in `nuxt.config.ts` with your
project's backend URL, and add the app's origin to the project's trusted
origins. To point a built app at another backend without rebuilding, set
`NUXT_PUBLIC_C15T_BACKEND_URL` when you start it:

```sh
NUXT_PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app \
node .output/server/index.mjs
```

Replace `phc_your_project_key` with your PostHog project key.

See the [Nuxt quickstart](https://c15t.com/docs/frameworks/nuxt/quickstart).

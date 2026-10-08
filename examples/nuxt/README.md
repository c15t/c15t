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
NUXT_PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app \
	bun run --cwd examples/nuxt dev
```

Use your project's backend URL, and add the app's origin to the project's
trusted origins. `nuxt dev` and `nuxt build` download the policy when they
start and stop if they can't, so the placeholder URL in `nuxt.config.ts` does
not run. Rebuild after you change the policy, translations or vendors in your
project.

Replace `phc_your_project_key` with your PostHog project key.

See the [Nuxt quickstart](https://c15t.com/docs/frameworks/nuxt/quickstart).

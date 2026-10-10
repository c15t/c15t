# c15t with Nuxt

The smallest c15t setup for a server-rendered Nuxt app. The build bundles your
project's policy into the server, and the server resolves each visitor from
it, so the banner is part of the first HTML. PostHog loads once the visitor
allows measurement.

- `nuxt.config.ts` registers the `c15t/vue` module. It reads the backend URL
  from `NUXT_PUBLIC_C15T_BACKEND_URL`, bundles the project's policy into the
  server and adds one consent route under `/api/c15t`.
- `app/app.config.ts` loads PostHog once the visitor allows measurement.
- `app/app.vue` mounts `ConsentRoot` and a Privacy settings link.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/nuxt dev
```

The app's `.env` points it at the `https://example-inth.inth.app` demo Inth
project. `nuxt dev` and `nuxt build` download its policy when they start. If
the download fails, `nuxt build` stops with an error, and `nuxt dev` logs a
warning and the server reads the policy at runtime. To use your own project,
set `NUXT_PUBLIC_C15T_BACKEND_URL` in `.env.local` to its backend URL and add
the app's origin to its trusted origins.

Rebuild after you change the policy, translations or vendors in your project.

Replace `phc_your_project_key` in `app/app.config.ts` with your PostHog project
key.

See the [Nuxt quickstart](https://c15t.com/docs/frameworks/nuxt/quickstart).

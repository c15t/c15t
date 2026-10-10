---
packages:
  '@c15t/astro': minor
  c15t: minor
---

### Astro: `c15t()` with no options, one consent route and a components barrel

`c15t()` now works with no options. The backend URL defaults to
`PUBLIC_C15T_BACKEND_URL`, read from the environment or `.env` in the project
root, and the mode defaults to `manifest()`. The modes are the data factories
from `c15t/modes`, re-exported from `c15t/astro`:

```js
// astro.config.mjs, server output
export default defineConfig({
	adapter: node({ mode: 'standalone' }),
	integrations: [svelte(), c15t()],
	output: 'server',
});

// static output, no adapter
export default defineConfig({
	integrations: [svelte(), c15t({ mode: hosted() })],
});
```

- `backendURL` is a top-level option. `hosted({ backendURL })` of its own
  still wins.
- `manifest({ snapshot, source, resolve })` replaces
  `manifest({ backendURL, manifest })`. `source: 'runtime'` fetches the policy
  at runtime instead of bundling it at build time. `resolve: 'browser'`
  resolves the policy in the browser, so a static site with no adapter can use
  `manifest()`: the integration prerenders `/api/c15t/manifest` for it.
- `reportSessions` is a top-level option.
- `routePrefix` (default `'/api/c15t'`, `false` for none) replaces
  `endpoints`. The integration injects one catch-all route,
  `${routePrefix}/[...path]`, from the `c15t/astro/api` entry, which answers
  `init` and `manifest`.
- `clientEntrypoint` resolves a relative path from the project root, and
  defaults to `src/c15t.client.ts`, `.js` or `.mjs` when the file exists.
  The browser options no longer carry its absolute path.
- `ui` defaults to the framework of the one Astro UI integration the site
  registers, among `@astrojs/svelte`, `@astrojs/react` and `@astrojs/vue`, and
  to `'svelte'` otherwise.
- `c15t()` throws when a serialized option holds a function, naming where it
  is. A vendor helper such as `posthog()` in `scripts` used to lose its
  callbacks without a word; move it to `src/c15t.client.ts`.
- The integration adds the type of `Astro.locals.c15t` to `.astro/types.d.ts`.
  Remove the `/// <reference types="c15t/astro/middleware" />` line from
  `src/env.d.ts`.
- `c15t/astro/components` exports `ConsentBanner`, `ConsentDialog`,
  `ConsentDialogLink`, `ConsentScript`, `IABConsentBanner` and
  `IABConsentDialog`. `ConsentBannerDeferred` renders a server island, so it
  stays at `c15t/astro/components/consent-banner-deferred.astro`.
- Server-rendered `manifest()` and `hosted()` pages ship only the code that
  saves consent. The init path loads when a page inits again.
- `offline()` reports the location it resolved for, so the preference dialog
  shows its title.
- `manifest()` without a backend URL, from `backendURL` or
  `PUBLIC_C15T_BACKEND_URL`, fails at setup, including
  `manifest({ snapshot })` and any `routePrefix`. The consent route answers
  `GET` only, so saves used to fail after the visitor chose.

With `manifest()`, the integration fetches the policy manifest during
`astro build` and dev startup and bundles it into the server. Middleware and
the consent route use that snapshot; the browser options omit it unless the
mode resolves in the browser. The fetch is skipped for `hosted()`,
`offline()`, `manifest({ snapshot })`, `manifest({ source: 'runtime' })` and
a relative backend URL. If the fetch fails or takes longer than 10 seconds,
`astro build` now stops with an error, where it used to warn and continue,
and `astro dev` logs a warning and fetches the policy at runtime. Set
`onBuildError`, or `C15T_ON_BUILD_ERROR`, to change that.

Removed, with no deprecated alias (these were v3 alpha only):

- `hosted({ url })`: use `hosted({ backendURL })`, or the top-level
  `backendURL`. `hosted({ domain })` is gone too.
- `manifest({ backendURL, manifest, reportSessions })`: use the top-level
  `backendURL` and `reportSessions`, and `manifest({ snapshot })`.
- `endpoints` and the `c15t/astro/api/init` and `c15t/astro/api/manifest`
  entries: use `routePrefix`.
- `buildManifest`: use `onBuildError`, or `manifest({ source: 'runtime' })`
  for `buildManifest: false`.
- `c15t/astro/components/consent-dialog-trigger.astro` and
  `ConsentDialogTrigger`: use `consent-dialog-link.astro` and
  `ConsentDialogLink`.
- `resolveTransportFactory`, `custom` and the `C15tModeDescriptor`,
  `C15tHostedDescriptor`, `C15tManifestDescriptor`, `C15tOfflineDescriptor`
  and `C15tEndpointOptions` types. Modes are `ConsentMode` from
  `c15t/astro`.
- `c15t/astro/api` no longer exports the route handlers. Import
  `createConsentRouteHandlers` and the manifest cache helpers from
  `c15t/astro/server`.

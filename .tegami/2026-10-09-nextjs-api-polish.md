---
packages:
  '@c15t/nextjs': minor
  c15t: minor
---

### Next.js reads `c15t.config.ts` on its own

`withConsentManifest()` now finds `c15t.config.ts` at the project root and
hands it to `ConsentRoot`, `resolveConsent()`, `createConsentRoute()` and the
Pages Router helpers, so the app no longer imports its config or writes a
client wrapper. Export the config as the file's default export. It is bundled
into the browser too, so it can hold `scripts` but must hold no secrets.

```ts
// c15t.config.ts
import { posthog } from '@c15t/integrations/posthog';
import { defineConsentConfig } from 'c15t/next';

export default defineConsentConfig({
	scripts: [posthog({ id: 'phc_your_project_key' })],
});
```

```tsx
// app/layout.tsx, a Server Component
import { ConsentBanner, ConsentDialog, ConsentRoot } from 'c15t/next';
import { resolveConsent } from 'c15t/next/server';

<ConsentRoot state={resolveConsent()}>
	{children}
	<ConsentBanner />
	<ConsentDialog />
</ConsentRoot>;
```

`c15t/next` has a `react-server` export: a Server Component imports
`ConsentRoot`, `ConsentBanner`, `ConsentDialog` and `ConsentDialogLink` as one
client module. This also fixes `next build --webpack`, which failed on React
hooks in the server graph. `ConsentTheme` and `defineTheme` are importable
there too.

The config takes `backendURL` (default `NEXT_PUBLIC_C15T_BACKEND_URL`),
`mode` (`manifest()`, `hosted()` or `offline()`, exported as data from
`c15t/next`; `manifest()` by default), `routePrefix`, `journey`, and the
browser options `scripts`, `vendors`, `clearOnRevocation`, `networkBlocker`,
`persistence`, `scriptLoader` and `options`. `ConsentRoot` props win over the
config's. `options` merges one key at a time and `options.callbacks` one
callback at a time, so `options={{ nonce }}` keeps the config's callbacks.
`ConsentRoot` warns in development when it finds no config, and throws when
`manifest()` or `hosted()` has no backend URL instead of running offline: set
`NEXT_PUBLIC_C15T_BACKEND_URL` or `backendURL` in the config, or choose
`mode: offline()`.
`options.mode` on `ConsentRoot` takes the same data, or a transport such as
`custom(transport)`; a `hosted()` or `offline()` transport from `c15t/react`
still works but warns in development, because its code is then in the
first-load bundle. With `manifest()` resolved on the server, the browser gets
no resolver, snapshot or other language.

`createConsentRoute()` serves `/manifest` and `/init` from one catch-all
route, such as `app/api/c15t/[...c15t]/route.ts`. Other paths under the
prefix return 404, or reach the backend with `proxy: true`. Set `routePrefix`
in the config to send the browser's init there; without it the browser calls
`${backendURL}/init`. Pages that `resolveConsent()` renders on the server don't
need the route.

To keep browser saves on your origin too, set `proxy: true` next to
`routePrefix` in the config, and pass `proxy: true` to `createConsentRoute()`
or `createPagesConsentRoute()`, which now takes it as well. The browser then
sends init and saves to `routePrefix`, while `resolveConsent()`, the route and
the build keep the absolute `backendURL`. This is the same option as TanStack
Start's `createConsentStateHandler({ proxy })`, and replaces pointing
`backendURL` at `/api/c15t` and passing the absolute URL to each server helper,
or a Next.js rewrite in the Pages Router.

`withConsentManifest()` writes the snapshot to `node_modules/.cache/c15t/`
and points `c15t/generated` at it, defaulting to
`NEXT_PUBLIC_C15T_BACKEND_URL`. Importing `c15t/generated` from a client
component fails the build, because the browser copy imports `server-only`.
The wrapper also adds `c15t`, `@c15t/core` and `@c15t/nextjs` to
`transpilePackages`, so Pages Router server code sees the snapshot and the
config. A failed download stops `next build` and warns in `next dev`; pass
`onBuildError` as the second argument, or set `C15T_ON_BUILD_ERROR`, to
change that. `output: 'export'` skips the download. So do the modes that
read no build-time manifest, as in Nuxt and Astro: `hosted()`, `offline()`,
`manifest({ snapshot })` and `manifest({ source: 'runtime' })` in
`c15t.config.ts`. A build in those modes never contacts the backend, so it no
longer needs `onBuildError: 'runtime'` when the backend is unreachable. The
wrapper also reads the config's `backendURL` before
`NEXT_PUBLIC_C15T_BACKEND_URL`.

The Pages Router gets `withConsentProps()`, a `getServerSideProps` that adds a
JSON-safe `consent` prop, and `ConsentPageProps` for `AppProps`:

```ts
// pages/index.tsx
export const getServerSideProps = withConsentProps();

// pages/api/c15t/[...c15t].ts
export default createPagesConsentRoute();
```

Removed, with no deprecated alias (these were v3 alpha only):

- `defineConsentConfig({ manifestURL, initURL })`: use `routePrefix`, or
  `mode: manifest({ resolve: 'browser', manifestURL })`.
- `ConsentRoot`'s `backendURL` prop: set `backendURL` in the config or
  `NEXT_PUBLIC_C15T_BACKEND_URL`. `config` is now an optional override.
- `createNextConsentRouteHandlers()` and its `manifestGET`: use
  `createConsentRoute()`.
- `createPagesApiHandlers()`: use `createPagesConsentRoute()` in a catch-all
  API route.
- The `manifest` option of `resolveConsent()` and `createConsentRoute()`: use
  `snapshot`, which defaults to the build's.
- `ConsentManifestOptions` and the `c15t.server.ts` pattern: use
  `ResolveConsentOptions` or `NextConsentRouteOptions` when you need them.
- `resolveStrictestDefaultInit` from `c15t/next/static`: use
  `resolveUnknownLocationInit`.
- `withConsentManifest()`'s `outputFile`, `exportName`, `importSource` and
  `rootDir` options, and the generated `c15t-manifest.ts`.

Changed: `hosted`, `offline` and `manifest` from `c15t/next` are now the data
factories. A `ConsentProvider` that needs a transport imports them from
`c15t/react`.

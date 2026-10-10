---
packages:
  '@c15t/svelte': minor
---

### Svelte and SvelteKit: `ConsentProvider`, `manifest()` and `ConsentRoot`

The Svelte quickstart is now one Vite plugin and one component:

```svelte
<script lang="ts">
	import { ConsentBanner, ConsentProvider, manifest } from '@c15t/svelte';
</script>

<ConsentProvider mode={manifest()}>
	<ConsentBanner />
</ConsentProvider>
```

`@c15t/svelte` exports `manifest()`, `hosted()` and `offline()` itself, so
Svelte apps import nothing from `@c15t/browser`. `manifest()` with no options
uses the snapshot and backend URL that `consentManifest()` from
`@c15t/svelte/vite` downloaded and serves as `c15t/generated`.
`manifest({ manifestURL })` fetches that URL when the page loads instead of
using the snapshot. `hosted()` with no options uses that backend URL too, as
in Vue and React, so a Svelte app no longer passes `hosted({ backendURL })`. `offline()` is now core's.

SvelteKit config lives in one place, the handle:

```ts
// src/hooks.server.ts
export const handle = c15tHandle(); // or c15tHandle({ mode: hosted() })

// src/routes/+layout.server.ts
export { loadConsent as load } from '@c15t/svelte/kit';
```

```svelte
<ConsentRoot state={data.consent}>
```

- `c15tHandle({ mode, routePrefix, snapshot, backendURL })` stores the
  config on `event.locals.c15t`. `mode` is data from `@c15t/svelte/kit`
  (`manifest()`, the default, `hosted()` or `offline()`). `c15tHandle()`
  throws for `routePrefix: '/'`: a catch-all route at the site root would
  catch every page.
- `loadConsent` works as `load` directly and returns `{ consent }`. It
  detects a prerender from SvelteKit's `building` flag, so `shared` is gone.
- `<ConsentRoot state>` turns the mode into a transport that loads each
  init path only when it runs. A server-resolved page ships no resolver,
  policy pack, snapshot or other language.
- `createConsentRoute()` serves `src/routes/api/c15t/[...path]/+server.ts`,
  needed only for prerendered pages, with `c15tHandle({ routePrefix:
  '/api/c15t' })`. It reads the handle's `snapshot`, `backendURL` and mode
  from `event.locals.c15t`, so they are set once; route options still win.
  In the proxy setup, `c15tHandle({ backendURL: '/api/c15t', routePrefix:
  '/api/c15t' })`, the route skips the handle's URL, which names the route
  itself, and forwards to the build's backend URL.
- `consentManifest()` now includes the module-preload plugin when the
  `sveltekit()` plugin is present, and keeps the snapshot out of the browser
  bundle there. It reads `PUBLIC_C15T_BACKEND_URL`, then
  `VITE_C15T_BACKEND_URL`, then `PUBLIC_INTH_PROJECT_URL` and
  `VITE_INTH_PROJECT_URL`. A failed download stops `vite build` and warns in
  `vite dev`; `onBuildError` and `C15T_ON_BUILD_ERROR` change that. In a
  Svelte single-page app, it warns when the bundled policy depends on the
  visitor's location and suggests `hosted()`.
- `/// <reference types="@c15t/svelte/kit/locals" />` in `src/app.d.ts`
  types `event.locals.c15t`.

Removed, with no alias, because `@c15t/svelte` was not public in v2:
`ConsentManagerProvider` (use `ConsentProvider`, or `ConsentRoot` in
SvelteKit), `Frame` (use `ConsentGate`), `createSvelteKitConsentRouteHandlers`
(use `createConsentRoute`), `c15tPreload` (part of `consentManifest()`),
`ConsentManifestOptions`, `consentManifest()`'s `outputFile`, `exportName`,
`importSource` and `rootDir` options, `loadConsent`'s `backendURL`,
`manifest`, `initRoute` and `shared` options, and the `prefetch` it returned,
and the `manifest` option of `resolveConsent` from `@c15t/svelte/server` (use
`snapshot`).
`@c15t/svelte` now needs SvelteKit 2.63 or later, for `$app/env`.

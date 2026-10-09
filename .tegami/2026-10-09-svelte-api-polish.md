---
packages:
  '@c15t/svelte': minor
  '@c15t/core': minor
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
`@c15t/svelte/vite` downloaded. `offline()` is now core's.

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
  (`manifest()`, the default, `hosted()` or `offline()`).
- `loadConsent` works as `load` directly and returns `{ consent }`. It
  detects a prerender from SvelteKit's `building` flag, so `shared` is gone.
- `<ConsentRoot state>` turns the mode into a transport that loads each
  init path only when it runs. A server-resolved page ships no resolver,
  policy pack, snapshot or other language.
- `createConsentRoute()` serves `src/routes/api/c15t/[...path]/+server.ts`,
  needed only for prerendered pages, with `c15tHandle({ routePrefix:
  '/api/c15t' })`.
- `consentManifest()` now includes the module-preload plugin when the
  `sveltekit()` plugin is present.
- `/// <reference types="@c15t/svelte/kit/locals" />` in `src/app.d.ts`
  types `event.locals.c15t`.

Removed, with no alias, because `@c15t/svelte` was not public in v2:
`ConsentManagerProvider` (use `ConsentProvider`), `Frame` (use
`ConsentGate`), `createSvelteKitConsentRouteHandlers` (use
`createConsentRoute`), `c15tPreload` (part of `consentManifest()`),
`ConsentManifestOptions`, `loadConsent`'s `backendURL`, `manifest`,
`initRoute` and `shared` options, and the `prefetch` it returned.
`@c15t/svelte` now needs SvelteKit 2.63 or later, for `$app/env`.

In `@c15t/core`, the browser manifest resolver loads its per-language
import table and the vendor-list cache on demand, and `clientMode()` builds
its offline chunk self-contained, so neither adds to first-load JavaScript.

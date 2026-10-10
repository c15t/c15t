---
packages:
  '@c15t/vue': minor
  c15t: minor
---

### Vue and Nuxt pick the policy source with `mode`

**Nuxt.** Set `mode` in `nuxt.config.ts` with `manifest()`, `hosted()` or
`offline()` from `c15t/vue`. The default is `manifest()`: the build downloads
the policy, the server resolves each visitor, and the browser ships no
resolver or snapshot. One catch-all consent route answers
`${routePrefix}/init` and `${routePrefix}/manifest`; `routePrefix` defaults
to `/api/c15t`, and `false` adds no route. For `nuxt generate` and other
static hosting, use `manifest({ resolve: 'browser' })` with
`routePrefix: false`: only then does the browser bundle get the snapshot.
`nuxt generate` with a server-resolved `manifest()` now logs a warning that
says so.

```ts
import { manifest } from 'c15t/vue';

export default defineNuxtConfig({
	c15t: { mode: manifest({ resolve: 'browser' }), routePrefix: false },
	modules: ['c15t/vue'],
	ssr: false,
});
```

`mode` and `routePrefix` are read from `nuxt.config.ts` only; `app.config.ts`
keeps `scripts`, `callbacks` and other runtime options. The module now
auto-imports every composable `c15t/vue/vue-plugin` exports, including
`useHasConsentPolicy`, `useHasConsentUi`, `useHasConsentPreferences` and
`useIabTranslations`.

The module bundles the manifest during `nuxt build` and dev startup, reading
`NUXT_PUBLIC_C15T_BACKEND_URL` when the `c15t` key sets no `backendURL`. The
fetch is skipped for `hosted()`, `offline()`, `manifest({ snapshot })`,
`manifest({ source: 'runtime' })`, a relative backend URL and `nuxt prepare`.
If the fetch fails or takes longer than 10 seconds, `nuxt build` now stops
with an error, where it used to warn and continue, and `nuxt dev` logs a
warning and fetches the policy at runtime. Set `onBuildError` under the `c15t`
key, or `C15T_ON_BUILD_ERROR`, to change that. Use
`manifest({ source: 'runtime' })` to always fetch at runtime, so policy edits
apply without a rebuild.

**Vue.** `app.use(c15tVue, { mode })` requires a mode: `manifest()`,
`hosted()`, `offline()` or `custom()` from `c15t/vue/vue-plugin`.
`manifest()` and `hosted()` read the backend URL and policy that
`consentManifest()` from `c15t/vue/vite` downloaded, served as
`c15t/generated`. The client manifest mode uses the shared browser resolver,
so it no longer downloads every language. The same entry exports the
components, so `ConsentRoot`, `ConsentDialogLink` and the rest import from
`c15t/vue/vue-plugin`. `consentManifest()` is now the only Vite plugin; the
package resolves its runtime imports itself. `@c15t/vue` declares
`sideEffects`, so bundlers drop what an app doesn't import.

```ts
import { c15tVue, manifest } from 'c15t/vue/vue-plugin';

createApp(App).use(c15tVue, { mode: manifest(), scripts }).mount('#app');
```

Removed, with no deprecated alias (these were v3 alpha only):

- Nuxt options `manifest`, `manifestURL`, `manifestSnapshot`, `buildManifest`,
  `geoURL`, `initRoute` and `manifestRoute`. Use `mode`, `routePrefix`,
  `onBuildError` and `manifest({ manifestURL, geoURL, snapshot })`.
- `ConsentPreferencesLink`. It is `ConsentDialogLink`, at
  `runtime/components/consent-dialog-link.vue`. The floating
  `ConsentDialogTrigger` stays.
- `ConsentFrame`. Use `ConsentGate`.
- Vue plugin options `backendURL`, `manifest`, `manifestSnapshot`,
  `manifestURL`, `customFetch` and `domain`. Pass them to the mode instead.
- The default `c15tVue` export of `c15t/vue/vite`: use `consentManifest`. The
  app plugin keeps the name `c15tVue`.
- The `c15t/vue/consent-root` and `c15t/vue/consent-widget` subpaths.
- `consentManifest()`'s `outputFile`, `exportName`, `importSource` and
  `rootDir` options, and the generated `c15t-manifest.ts`.

`offline()` now reports the location it resolved for, so the preference
dialog shows its title.

**Location-based policies in the browser.** When the policy depends on the
visitor's country or region and the browser has no location, the Vue
plugin's `manifest()` and Nuxt's `manifest({ resolve: 'browser' })` now ask
the backend's `/init`, as React, Svelte and `@c15t/browser` do. They used to
apply the rule for an unknown location without a request, which could be
another region's rules. Pass `inputs` or `geoURL` to resolve in the browser,
or `initFallback: false` to the Vue plugin's `manifest()` to keep the old
behaviour. `consentManifest()` from `c15t/vue/vite` now warns when a
`manifest()` build bundles such a policy, and suggests `hosted()`.

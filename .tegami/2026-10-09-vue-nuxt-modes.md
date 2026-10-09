---
packages:
  '@c15t/vue': minor
  '@c15t/astro': patch
  '@c15t/core': patch
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

**Vue.** `app.use(c15tVue, { mode })` requires a mode: `manifest()`,
`hosted()`, `offline()` or `custom()` from `c15t/vue/vue-plugin`.
`manifest()` and `hosted()` read the backend URL and policy that
`consentManifest()` from `c15t/vue/vite` downloaded. The same entry exports
the components, so `ConsentRoot`, `ConsentDialogLink` and the rest import
from `c15t/vue/vue-plugin`. `consentManifest()` is now the only Vite plugin;
the package resolves its runtime imports itself. `@c15t/vue` declares
`sideEffects`, so bundlers drop what an app doesn't import.

```ts
import { c15tVue, manifest } from 'c15t/vue/vue-plugin';

createApp(App).use(c15tVue, { mode: manifest(), scripts }).mount('#app');
```

**Removed** (these were v3 alpha only):

- Nuxt options `manifest`, `manifestURL`, `manifestSnapshot`, `buildManifest`,
  `geoURL`, `initRoute` and `manifestRoute`. Use `mode`, `routePrefix`,
  `onBuildError` and `manifest({ manifestURL, geoURL, snapshot })`.
- `ConsentPreferencesLink`. It is `ConsentDialogLink`, at
  `runtime/components/consent-dialog-link.vue`. The floating
  `ConsentDialogTrigger` stays.
- `ConsentFrame`. Use `ConsentGate`.
- Vue plugin options `backendURL`, `manifest`, `manifestSnapshot`,
  `manifestURL`, `customFetch` and `domain`. Pass them to the mode instead.
- The default `c15tVue` export of `c15t/vue/vite`, and the
  `c15t/vue/consent-root` and `c15t/vue/consent-widget` subpaths.

`offline()` from `@c15t/core` now reports the location it resolved for, so
the Vue and Astro preference dialog shows its title.

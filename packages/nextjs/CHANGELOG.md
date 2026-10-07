## @c15t/nextjs@3.0.0-alpha.6 (alpha)

### `ConsentRoot` starts consented scripts sooner

In Next.js and TanStack Start, `ConsentRoot` starts downloading the script
loader during its first render when stored consent already allows one of its
`scripts`, instead of after hydration. There is nothing to configure.

### Generate consent manifests during application builds

Add opt-in build-time manifest snapshots for Next.js, TanStack Start, Astro,
Nuxt and Vite apps. Build plugins take `backendURL` and fetch its `/manifest`.
Server helpers and consent routes resolve from the snapshot without fetching
an upstream manifest. Geography, language, privacy signals and stored consent
still resolve per visitor.

Snapshots stay fixed until the next build. Use runtime fetching for policy
updates that must apply without a rebuild. A manifest fetch failure or
invalid snapshot fails the build. Consent saves, session reports and IAB
vendor lists still call the backend.

Svelte's framework-free `resolveConsent` also accepts a snapshot. Both Svelte
server helpers take a background-work callback to keep session reports alive
on serverless hosts without `waitUntil`.

Next.js runtime manifest requests use the App Router Data Cache with a
300-second revalidation. `manifestRevalidateSeconds: false` skips that cache
instead of caching indefinitely.

### Export category, cleanup and policy types from the framework entries

You can type `consentCategories`, `clearOnRevocation` and
`offline({ policyRules })` from the same import as the provider.

- `c15t/react`, `c15t/next` and `c15t/tanstack-start` add `AllConsentNames`,
  `ClearOnRevocationConfig`, `PolicyRule` and `policyRulePresets`.
- `@c15t/svelte` adds `ClearOnRevocationConfig`, `PolicyRule` and
  `policyRulePresets`.
- `c15t/astro` adds `ClearOnRevocationConfig`.
- `c15t/vue` adds `AllConsentNames` and `ClearOnRevocationConfig`.

Importing them from `c15t` keeps working.

## @c15t/nextjs@3.0.0-alpha.5 (alpha)

### React provider on the shared runtime

`@c15t/react`'s `ConsentProvider` now renders the runtime from
`createConsentProviderRuntime`, the same one the Svelte provider uses, instead
of its own copy. Its props, hooks and the `runtime` prop are unchanged.
`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start` picks this up.

**Breaking.** `persistence` and `storageConfig` are read once, when the
provider mounts. A new storage key used to move the stored choice to the new
key; now the choice stays where it was, data clearing keeps protecting that
key, and a warning is logged outside production. The same applies to every
provider runtime, including Svelte's. Migration: remount the provider to move
storage.

Behaviour that changes:

- A `prefetch` that is still marked `initialPolicyPending` is no longer
  adopted as the answer: the provider sends `/init`.
- Adopting a server-resolved `prefetch` raises `init:applied`, as an `/init`
  response does.
- A streamed `prefetch` that carries an experiment but arrives after mount
  keeps `experiment` in the `/init` request the provider falls back to.
- A provider rendered under a `consentSource` raises `init:applied` once the
  source is connected.
- After mount, a new `user`, `vendors`, `scripts` or blocker options apply
  once a small chunk has loaded, the first time options change. `enabled`,
  `overrides` and `consentCategories` still apply at once, and requests that
  new network rules match are held until the blocker has them.

`ConsentProvider` loads the code that applies a `prefetch` promise only when it
gets one, so an app that never streams consent state doesn't download it.
`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start`, whose `state` is
usually streamed, ships that code in its first-load chunk, so a streamed state
applies as soon as it arrives instead of after one more request.

`@c15t/react`'s index now re-exports its values in groups with `export *`.
The names are the same. Under esbuild's code splitting, an app that imports
only `ConsentProvider` or a hook no longer loads the dialog trigger, branding
and draft modules on first load, because the deferred dialog no longer pulls
every module the index names into the first chunk.

`@c15t/ui`'s `setupColorScheme` moves to its own module,
`@c15t/ui/utils/color-scheme`. A provider that sets the color scheme no longer
shares a chunk with the dialog's focus-trap and scroll-lock helpers.
`@c15t/astro` imports it from the new path.

**Breaking.** `@c15t/ui/utils/dom` no longer exports `setupColorScheme`.
Migration: import it from `@c15t/ui/utils/color-scheme` or `@c15t/ui/utils`.
The old path is not kept as a re-export: Vite 8 (Rolldown) counts unused
imports when it checks a build's chunks for cycles, and in TanStack Start that
re-export closed one, so each module a lazy chunk shared with the route became
its own first-load file.

### Provider runtime

- `c15t/runtime/provider` (`@c15t/core/runtime/provider`) exports what a
  provider that loads modules on demand needs: `createConsentProviderRuntime`,
  `lazyRuntimeModule` and `lazyStreamPrefetch`, which loads the
  streamed-prefetch code only for a runtime whose `prefetch` is a promise.
  Importing `c15t/runtime` instead can keep the statically imported default
  modules in the first chunk under esbuild.
- `update()` returns a promise that settles once every change has applied.
  The comparison behind it loads with the first `update()`.
- A `consentSource` connects through a new `connectConsentSource` module
  (part of `defaultRuntimeModules`). The React provider imports it on demand;
  until it connects, no optional category is granted.
- IAB mounts through a new `mountIAB` module (`mountRuntimeIAB`, part of
  `defaultRuntimeModules`). A provider that passes its own modules without it
  ignores `iab`.
- With a script loader that loads on demand, data clearing now subscribes after
  the loader has loaded, so revocation callbacks run before browser data is
  removed.
- `persistence.now` is passed through to persistence; the runtime used to drop
  it.

### One manifest cache for every server adapter

Next.js, Nuxt, SvelteKit, Astro and TanStack Start now read the backend manifest through one function, `fetchCachedManifest` from `@c15t/core/server`, and share one in-process cache of up to 128 entries. Before, SvelteKit and Astro kept a separate 64-entry cache and Next.js a third one, and each took different options.

The cache key is now the same for every caller. Query parameters are sorted by name and the URL fragment is dropped, so `?b=2&a=1` and `?a=1&b=2` read one entry and reach the backend as one request. That request keeps the first caller's URL and query as written, so a signed `manifestURL` still verifies. Request headers that equal the ones the cache sends anyway (`accept: application/json` and the c15t protocol headers) no longer split the cache. The `init` option passes a framework fetch hint such as Next.js `{ next: { revalidate } }` and is not part of the key.

**Breaking.**

- `@c15t/core/libs/manifest-cache` and `c15t/libs/manifest-cache` are removed. Import `fetchCachedManifest` and `clearManifestCache` from `@c15t/core/server` (`c15t/server`) and pass `sourceURL` instead of `url`. The `CachedManifest` type is now `CachedManifestResponse`.
- `fetchCachedManifest` from `@c15t/core/server` and `@c15t/astro/api` takes `sourceURL` instead of `config` (build it with `resolveManifestSourceURL({ backendURL, manifestURL })` from `@c15t/core/server`), and reads the shared cache. The `ManifestSourceConfig` type is removed; use `ManifestSourceOptions`.
- `@c15t/vue/runtime/server/manifest-mode` and `c15t/vue/runtime/server/manifest-mode` are removed. Import the manifest cache and its helpers from `@c15t/core/server` instead, and `resolveManifestInit` and `getResolverInputsFromHeaders` from `@c15t/core/transports/manifest-cache`; `clearManifestRouteCache()` is `clearManifestCache()`.

### One consent route handler for every server adapter

The `/manifest` and `/init` routes of Next.js, TanStack Start, SvelteKit, Astro and Nuxt now run on one handler, `createConsentRouteHandler` from `@c15t/core/server`. Each adapter keeps its own entry point (route handlers, server routes, `RequestHandler`, `APIRoute`, h3 event handlers) and the same options. The copies had drifted; every adapter now follows these rules:

- The manifest route passes only a `language` query parameter that looks like a language tag to the backend. Other parameters a visitor adds are dropped, so they no longer reach the backend or add manifest cache entries. SvelteKit, Astro and Nuxt used to forward the whole query string.
- The manifest route passes `cache-control`, `etag`, `last-modified` and `content-language` through, sends an adjusted `age`, and answers a matching `If-None-Match` with `304`. It never adds a `cache-control` header the backend did not send.
- The init route negotiates the policy contract in every adapter (before, only Next.js and Nuxt did), always answers with `x-c15t-policy-contract: 1`, and echoes `resolvedOverrides` and `resolvedPrivacySignals` (Next.js did not). A resolution that did not match carries no `policySnapshotToken`, `gvl`, `gvlReference`, `cmpId` or `customVendors`.
- A vendor list that cannot be loaded fails the init request. Astro answered `gvl: null`, which the browser reads as "IAB is off". The default vendor-list fetch now goes through the shared server cache with a five-second deadline. SvelteKit and Astro used an uncached fetch, and SvelteKit's had no deadline.
- When the manifest cannot be read and `backendURL` is set, the init route asks the backend's own `/init` and passes on its `vendors`, `vendorListVersion` and `resolvedPrivacySignals`. This covers backends without `/manifest`. It was Nuxt-only.
- A session report is skipped when the request was aborted before the route answered, in every adapter. The rest of an aborted request goes to the platform's `waitUntil`.
- `x-c15t-timeout-ms` on an init request bounds the manifest read, the vendor list and the `/init` fallback, in every adapter. Nuxt's server render already sent it.
- With `proxy` on, the manifest request carries the cookies `cookieNames` names and the extra `forwardHeaders` in SvelteKit too, not only TanStack Start, and a manifest read with them is answered `private, no-store`.
- On a catch-all route, `init` or the route root answers init, `manifest` answers the manifest, and any other path is proxied with `proxy` on or answers `404`. SvelteKit used to answer other paths with init. TanStack Start now answers the route root with init.

`fetchCachedGvl` from `@c15t/core/server` now reads and fills the same process cache as the one from `@c15t/core`, instead of a separate one.

**Breaking.**

- `@c15t/nextjs/api` no longer exports `fetchCachedManifest`, `getSMaxAge` or `ManifestFetchResult`. Use `fetchCachedManifest` from `@c15t/core/server`. `manifestGET` no longer substitutes `public, s-maxage=300, stale-while-revalidate=86400` when the backend sends no `cache-control`, and no longer sends `x-c15t-next-revalidate`. Its configuration error now reads `@c15t/nextjs: pass backendURL or manifestURL.`
- In `@c15t/astro/api`, `resolveManifestInit` rejects when an IAB policy's vendor list cannot be loaded instead of returning `gvl: null`, and the `FetchGvl` callback receives `fetch` typed as `typeof globalThis.fetch`. The server render then leaves the policy to the browser.
- In `@c15t/svelte/kit`, a catch-all route answers `404` for any path other than `init`, `manifest` or the route root, unless `proxy` is on. It used to answer those paths with init. Migration: send init requests to `<route>/init` or the route root; c15t's own clients already do.

### One server-side consent resolution for every adapter

`resolveConsent` in Next.js, TanStack Start and SvelteKit, `loadConsent` and `c15tHandle` in SvelteKit, the Astro middleware and the Nuxt plugin now resolve a request's consent state through one function, `resolveRequestConsent` from `@c15t/core/server`. Each adapter keeps its own entry point and reads the request with its framework's API. The copies had drifted; every adapter now follows these rules:

- **What the backend receives.** A hosted `/init` request carries the resolved country, region, language and GPC signal, the `user-agent`, and the experiment arm while the visitor has no stored choice. Over `https` or to a loopback host it also carries the consent cookie (`cookieName` or `storageConfig.storageKey`) and any `forwardHeaders`. It never carries the rest of the cookie jar: Next.js and SvelteKit used to send every cookie the site owns. The visitor IP travels as `x-forwarded-for` only with `trustForwardedHeaders`; Next.js and SvelteKit used to copy the client's `x-forwarded-for`. `forwardHeaders` cannot name `cookie` or a `forwarded`/`x-forwarded-*` header. A manifest request carries nothing about the visitor unless you name headers or cookies for it.
- **Own routes.** A server render never fetches the app's own consent routes over the network: the routes an adapter mounts (TanStack Start `routePrefix`, `/api/c15t` by default; Astro's injected endpoints) or declares (Next.js `config.manifestURL` and `config.initURL`). It renders without a server decision and, in Next.js, says why in development. SvelteKit and Nuxt reach their own init route in-process through `event.fetch` and Nitro's local fetch, as before. Next.js mounts nothing under `/api/c15t`, so a `backendURL` of `/api/c15t` (a rewrite or a mounted backend) is still asked for `/init`. A hosted request to the app's own origin is marked; a render whose request carries the mark does not fetch its origin again, so a prefix that answers with a page cannot loop.
- **Next.js manifest source.** With `config` and a same-origin `config.manifestURL`, `resolveConsent` reads `${config.backendURL}/manifest` through the same process cache entry the manifest route uses, instead of fetching that route. When `config.backendURL` is the `/api/c15t` rewrite prefix, pass the handlers' upstream URL as `resolveConsent`'s `backendURL` too.
- **GPC.** Every adapter reads `x-c15t-gpc`, then `sec-gpc`, and leaves an absent signal `undefined`. SvelteKit read only `sec-gpc` and turned a missing header into `false`.
- **Budget.** `timeoutMs` means the same everywhere: `false` or `Infinity` waits for the upstream, and a value that is not a finite, non-negative number uses the 500 ms default. Astro and Nuxt turned `NaN` into no budget. `@c15t/svelte/server`'s `resolveConsent` now has the same 500 ms default; it had none.
- **Shared renders.** A prerendered or cached render reads no visitor facts, carries no stored records, clock, GPC signal or experiment arm, and makes no hosted or manifest request; offline mode still resolves. TanStack Start applies it while it prerenders and accepts `shared`. SvelteKit accepts `shared` on `c15tHandle` and `loadConsent`; pass SvelteKit's `building` flag. Astro (`isPrerendered`) and Nuxt (prerender and cache route rules) keep their rules.
- **Vendor list.** The full Global Vendor List is replaced by a reference whenever the browser can fetch it the same way: no custom `fetch`, and no cookie or private header on the request. The app's own init route reads no cookie, so SvelteKit and Nuxt in-process renders send none and keep the reference.

**Breaking.**

- `@c15t/nextjs/server` no longer exports `DEFAULT_FORWARD_HEADERS` (`x-forwarded-for` and `user-agent`), and there is no default list to extend. `resolveConsent` always sends `user-agent`, sends the visitor IP as `x-forwarded-for` only with `trustForwardedHeaders: true`, and adds the request headers you name in its `forwardHeaders` option. `onError` receives an error that names the URL, with the original failure as `cause`.
- `@c15t/astro/api` no longer exports `loadConsentManifest`, `resolveManifestInit`, `resolveSessionReportURL`, `ResolvedInitOutput` or `SessionReportTarget`; the server render uses `resolveRequestConsent`. The server render no longer sends the consent cookie over plain HTTP to a same-origin host that is not loopback.
- `@c15t/vue/runtime/manifest` no longer exports `C15T_TIMEOUT_HEADER`, `DEFAULT_NUXT_RESOLVE_TIMEOUT_MS` or `resolveNuxtTimeoutMs`. Use `CONSENT_ROUTE_TIMEOUT_HEADER` from `@c15t/core/server`. The Nuxt plugin keeps the resolved state in `useState('c15t:consent')` instead of a `useFetch` result under `c15t:init`. On a route rendered only in the browser (`ssr: false`), the plugin no longer holds the app's mount until `/init` answers: the app paints first and the runtime starts init once it mounts. The Nuxt client bundle drops `useFetch` and the vendor-list deferral code from the plugin (about 4.6 KB gzip of initial JavaScript in the benchmark app).
- In `@c15t/svelte/kit`, `C15tHandleOptions` is an interface with `shared`, and `loadConsent`'s `fetch` is used only for a backend on another origin; same-origin URLs always go through `event.fetch`.

## @c15t/nextjs@3.0.0-alpha.4 (alpha)

### Resolve a relative backendURL against the request, not forwarding headers

A relative `backendURL` or `manifestURL` no longer resolves against client-controlled forwarding headers. The server helpers previously built the backend origin from `x-forwarded-host`, `x-forwarded-proto` or `referer` when present, so a request that set them could make the server send its `/init` or manifest request, with the request's cookies and forwarded headers, to another host.

A relative URL now resolves against the URL the framework resolved the request under (`event.url` in SvelteKit, `request.url` in Next.js route handlers, TanStack Start and Astro), or against the `host` header where no request URL exists (Next.js `resolveConsent`, `fetchSSRData`). A bare `host` resolves over `https` for a domain name and over `http` for `localhost`, an IP address, or a single-label host such as `app:3000`. The `referer` header is no longer used.

Apps behind a proxy that sets forwarding headers and drops incoming ones can opt back in with `trustForwardedHeaders: true` on SvelteKit `loadConsent` and `resolveConsent`, Next.js `resolveConsent`, `createNextConsentRouteHandlers` and `createPagesApiHandlers`, and `@c15t/react/server` `fetchSSRData` and `normalizeBackendURL`, matching the existing TanStack Start option. The rule lives in `resolveRequestBackendURL` and `resolveRequestOrigin`, new exports of `@c15t/core/server`, which every server adapter now shares. With the option set, the forwarded host and the forwarded scheme apply independently, so a proxy that keeps `host` and only sets `x-forwarded-proto` or `x-forwarded-ssl` still decides the scheme.

The SvelteKit and `@c15t/react/server` helpers also stop passing the client's `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers to the backend, including when `forwardHeaders` names them in SvelteKit. `extractRelevantHeaders` in both packages leaves them out unless called with `{ trustForwardedHeaders: true }`. `fetchSSRData` still makes its `/init` request when those headers are the only ones besides `host`; it just does not forward them.

`resolveBackendURL` from `@c15t/schema/types` is deprecated in favor of `resolveRequestBackendURL`. It now follows the same rule by default: it reads only the `host` header, and ignores `x-forwarded-*` and `referer` unless its new third argument is `{ trustForwardedHeaders: true }`, which restores the previous resolution order. The forwarded values are now validated like `host`: the first entry of a comma-separated list is used, a scheme other than `http` or `https` is ignored, and a host that is not a bare authority resolves to `null`.

### Count each experiment arm's visitors through `/init`

The backend now learns which arm a visitor runs before they choose, so a dashboard can compute an opt-in rate per arm without any analytics setup. While a visitor has no stored choice, `/init` carries their arm in an `x-c15t-experiment: <id>=<arm>` header, and the backend adds `experiment: { id, arm }` to that request's session report. Manifest-mode renders and init routes put it on the report they send to `POST /sessions`. A visitor who already chose is not counted, because they are not shown the banner.

On a server-rendered page, pass the experiment with the visitor's arm to `resolveConsent({ experiment: { ...bannerShape, arm } })` in `c15t/next`, `@c15t/tanstack-start` and `@c15t/svelte`. The server sends only `{ id, arm }` to the backend, and the returned state carries the experiment to the client, so the provider needs no `experiment` option of its own. A streamed (unawaited) state arrives after the provider mounts, so pass the experiment to the client too; the provider warns in development when you forget. Astro and Nuxt send the arm they rendered on their own. `@c15t/schema` exports `CONSENT_EXPERIMENT_HEADER`, `formatExperimentHeader` and `parseExperimentHeader`, and the session report schema gains an optional `experiment`.

The `choice:recorded` kernel event and `onChoiceRecorded` payload now include `uiSource` and `consentAction`, and `onSurfaceShown` and `onChoiceRecorded` carry the arm, so forwarding experiment events to GTM, PostHog or any other tool is one callback.

Opt-out experiments are measurable too. The `notice:dismissed` kernel event now carries `surface`, `timeToDecisionMs` and `experiment`. The surface is the snapshot's `activeUI`, so a programmatic `dismissNotice()` with no prompt open reports `surface: 'none'` and no timing, the same as a programmatic `save()`.

Dev-tools show the assigned experiment arm and the first impression time of each surface on the Policy tab.

### A/B test banner presentation with any flag provider

Add an `experiment` option for A/B tests on banner and preferences presentation. Your `presentation` is the `control` arm; `arms` lists what every other arm changes. Pass the `arm` your feature flag resolved (Vercel Flags, PostHog, LaunchDarkly, GrowthBook, Statsig), or a `split` such as `{ control: 60, wall: 40 }` for c15t to pick. `defineExperiment()` infers the arm names, so a misspelled `arm` or `split` key is a type error.

```ts
experiment: {
  id: 'banner-shape',
  arms: { wall: { prompt: { variant: 'wall' } } },
  arm: flagValue, // or split: { control: 60, wall: 40 }
}
```

The arm is merged over `presentation` and exposed as `snapshot.experiment` (React and Vue `useExperiment()`, Svelte `state.experiment`, browser `client.presentation`). It rides on `surface:shown` and `choice:recorded` and is saved with the choice as `metadata.experiment`, but only once the banner has shown it in the current page. A returning visitor who changes their choice from a footer link is not counted toward an arm they never saw.

When c15t picks the arm, it does so when the page starts, before `/init`, and holds the banner until the arm is checked, so the visitor never sees one banner swap for another; on a server-rendered page the banner appears after hydration. The arm is stored as `{ id, arm }` under `c15t-experiment-v1` once the banner has shown it. Nothing is stored for a visitor who is never prompted or for an arm from your flag, and no identifier is stored.

Arm validation loads as its own chunk, only when `experiment` is set, so a site without an experiment ships none of it. It is also exported from `c15t/experiment`, where `validateExperiment()` lets a test fail a build on a rejected arm.

Nothing in the experiment throws into the page. An undeclared `arm` or an unusable `split` logs an error and runs no experiment. An arm that trips a presentation diagnostic under the visitor's policy is not shown to that visitor, who sees `control` and is not counted, unless `acknowledgeDiagnostics: true`, which is recorded with the arm.

`@c15t/astro` resolves the arm on the server: per request through `consentMiddleware({ experimentArm })` from `@c15t/astro/middleware` with `middleware: false`, or one fixed `arm`. Arms vary presentation and theme, not copy.

An arm can also carry `theme` overrides (`arms: { bold: { theme: { colors: { primary: '#0a0a0a' } } } }`), merged one token group deep over the host `theme`. Read the merged theme with React `useResolvedTheme()`, Vue `useResolvedTheme(theme)`, Svelte `getConsentManager().theme` and browser `client.theme`. In React, render its tokens with `<ConsentTheme theme={useResolvedTheme()} />`.

### Load the Tailwind 3 PostCSS plugin from the package you installed

Every package that publishes a c15t stylesheet now exports the Tailwind 3 PostCSS plugin as `<package>/postcss-tailwind3`, so you no longer install `@c15t/ui` just to list it:

- `c15t/postcss-tailwind3` for apps that install `c15t` (React, Next.js, TanStack Start, Vue, Nuxt and Astro)
- `@c15t/svelte/postcss-tailwind3` for Svelte and SvelteKit
- `@c15t/browser/postcss-tailwind3` for script tag pages that style the light DOM
- `@c15t/react/postcss-tailwind3`, `@c15t/nextjs/postcss-tailwind3`, `@c15t/tanstack-start/postcss-tailwind3`, `@c15t/vue/postcss-tailwind3` and `@c15t/astro/postcss-tailwind3` for apps that install an adapter directly

```js title="postcss.config.mjs"
export default {
	plugins: {
		'c15t/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
```

Each one re-exports `@c15t/ui/postcss-tailwind3`, so configs that already list that name keep working. The plugin must still come before `tailwindcss`.

`c15t setup` now adds the plugin from the package it installs, `c15t/postcss-tailwind3`, or `@c15t/react/postcss-tailwind3` and `@c15t/nextjs/postcss-tailwind3` in apps that installed those directly, and no longer installs `@c15t/ui` for Tailwind 3. It leaves a config alone when any c15t `postcss-tailwind3` entry, including `@c15t/ui/postcss-tailwind3`, already runs before `tailwindcss`.

### Rename the remaining `frame` names to `consentGate`

**Breaking.** `ConsentGate` was called `Frame`, and several names still said so. They now say `consentGate`:

- The translations section `frame` is now `consentGate` (`consentGate.title`, `consentGate.actionButton`, `consentGate.policyBlocked`, `consentGate.loading` and `consentGate.error`) in every bundled language, in `CompleteTranslations` and `Translations`, in the `/init` response schema, in `@c15t/backend` responses and in the React Native translation types. `FrameTranslations` is now `ConsentGateTranslations`, and the old name stays as a deprecated alias.
- The stylesheet `@c15t/ui/styles/components/frame` is now `@c15t/ui/styles/components/consent-gate`, and its custom properties are `--consent-gate-*` instead of `--frame-*`.
- The placeholder's test ids are `consent-gate-placeholder` and `consent-gate-button` instead of `frame-placeholder` and `frame-open-dialog`. Its title now has `consent-gate-title`.

Copy under the old key still works. When custom translations, `i18n.messages`, stored copy or an older backend's `/init` response has `frame`, c15t reads it as `consentGate`, with `consentGate` winning key by key when both are set, and logs a warning once outside production. `@c15t/translations` exports the conversion as `migrateLegacyTranslationKeys`. The `frame` stylesheet subpaths stay as deprecated aliases of `consent-gate` for this alpha.

`theme.slots` has a `consentGate` family for the placeholder: `consentGate` for the card, `consentGateTitle` and `consentGateButton`. React, Next.js, TanStack Start, Vue and Svelte apply them. React and Vue also take the same parts as `components['consent-gate'].root`, `.title` and `.button`, and `components` wins where both set an attribute. `consentGateButton` applies on top of `buttonPrimary`.

### Report banner impressions and time to decision

Report banner and dialog impressions, not only choices. The kernel emits a `surface:shown` event when the banner or the dialog becomes visible and records the first impression time of each surface in `snapshot.surfaceShownAt`, so a late subscriber can still read it. Provider callbacks gain `onSurfaceShown` (React and Vue/Nuxt `callbacks.onSurfaceShown`); `@c15t/browser` dispatches `c15t:surfaceShown`; dev-tools log the event. A recorded choice now carries `timeToDecisionMs` (impression to action) on the `choice:recorded` event, on `onChoiceRecorded`, and on the saved consent as `metadata.timeToDecisionMs`. `kernel.commands.save()` accepts a `uiSource` override, and the React `uiSource` prop now reaches the save payload, so `ConsentWidget` saves are attributed to `widget` instead of the active banner. The never-fired `onBannerFetched` callback and `OnBannerFetchedPayload` type are removed.

`kernel.markLive()` is public: an adapter that renders from a server-resolved prefetch and never calls `init()` calls it after hydration, so the server-rendered banner still counts as an impression. The core runtime, the React provider (and so Next.js and TanStack Start) and the Vue runtime (and so Nuxt) do this; before, an SSR page with a resolved prefetch never emitted `surface:shown`.

`consentAction` on a saved choice now stays `all` or `necessary` when the host displays only a subset of the policy scope (`consentCategories`). It names the action the visitor took; `confirmed` names the categories it covered. Before, a narrowed accept-all was recorded as `custom`.

A choice saved while a `notice` prompt is owed now records the notice dismissal with it. Before, a visitor who opened the preference center from an opt-out notice and rejected was shown the notice again.

### Load new copy from `useSetLanguage()` and fix composed banner parts

`useSetLanguage()` now runs init again after storing the language, so the banner and dialog switch to that language without a separate `init()` call. Setting the current language does nothing, and a disabled provider stores the language without running init. With a `runtime` passed to `ConsentProvider`, the runtime reinitializes itself.

The React `offline()` mode, also exported by `@c15t/nextjs` and `@c15t/tanstack-start`, is now core's `offline()`. A language from `useSetLanguage()` or `overrides.language` switches the copy when the bundled translations or `i18n.messages` have that language, and a language with no copy keeps the default copy. The language a server prefetch detected from `Accept-Language` still does not switch the copy, including when `prefetch` is a pending promise.

`ConsentProvider` logs a development warning when `options.callbacks` is passed together with `runtime`. The runtime runs the callbacks its owner passed to `createConsentRuntime({ callbacks })`, and the provider's own callbacks were dropped without notice. The options type for a borrowed runtime now rejects `callbacks`.

Composed banner parts:

- `ConsentBanner.Card` fills a callback ref and keeps its focus trap. Before, a callback ref replaced the ref the trap read, so a blocking card did not trap focus.
- `ConsentBanner.Title` and `ConsentDialog.HeaderTitle` with `asChild` render the child element, such as an `h1`, in place of the `h2`. Before, the child was nested inside the `h2`. `ConsentBanner.Overlay` now honors `asChild` too. `ConsentBanner.Description` and `ConsentDialog.HeaderDescription` with `asChild` and no child element render their default markup instead of nothing.
- `ConsentBanner.AcceptButton`, `RejectButton` and `CustomizeButton` placed by hand now carry `data-action="accept"`, `"reject"` and `"customize"`, as they do in the stock banner, and pick up `theme.consentActions.accept`, `.reject` and `.customize`. An explicit `data-action` or `consentAction` prop still wins.

### Pass the backend URL to the server helpers

**Breaking.** The server helpers no longer read c15t configuration from environment variables. Pass `backendURL` or `manifestURL` to them. If you keep the URL in an environment variable, read it in your own code and pass the value.

| Helper | No longer read |
| --- | --- |
| `createNextConsentRouteHandlers`, `createPagesApiHandlers` (`c15t/next/api`, `c15t/next/pages`) | `C15T_BACKEND_URL`, `NEXT_PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL`, `C15T_MANIFEST_REVALIDATE_SECONDS` |
| `createConsentServerRoute` (`c15t/tanstack-start/api`) | `C15T_BACKEND_URL`, `VITE_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `createSvelteKitConsentRouteHandlers` (`@c15t/svelte/kit`) | `C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |
| `manifest()` mode and its injected routes (`c15t/astro`) | `C15T_BACKEND_URL`, `PUBLIC_C15T_BACKEND_URL`, `C15T_MANIFEST_URL` |

These helpers now take a required options argument. Without `backendURL` or `manifestURL`, each request throws, for example `@c15t/nextjs/api: pass backendURL or manifestURL.` Astro's `manifest()` without a `backendURL` or an inline `manifest` fails when `astro.config` loads. `manifestRevalidateSeconds` defaults to `300`.

The ready-made handlers built from environment variables are removed: `GET` and `manifestGET` from `c15t/next/api` and `@c15t/nextjs/api`, and `GET`, `manifestGET` and `initGET` from `c15t/tanstack-start/api` and `@c15t/tanstack-start/api`.

Before:

```ts title="app/api/c15t/manifest/route.ts"
export { manifestGET as GET } from 'c15t/next/api';
```

After:

```ts title="app/api/c15t/manifest/route.ts"
import { createNextConsentRouteHandlers } from 'c15t/next/api';

import { consentConfig } from '@/c15t.config';

export const { manifestGET: GET } =
	createNextConsentRouteHandlers(consentConfig);
```

The init route takes `GET` from the same call. You can pass options instead of a config, for example `createNextConsentRouteHandlers({ backendURL: 'https://your-project.inth.app' })`.

`c15t setup` writes the chosen backend URL into the generated components, `c15t.config.ts` and the `next.config` rewrite as a string. Quotes and backslashes in the URL are escaped, so they no longer break the generated `next.config`. It no longer writes `.env.local` or `.env.example`, no longer asks whether to store the URL in a `.env` file, and no longer accepts `--env`.

### Load only the dialog link from its subpath

`@c15t/nextjs/components/consent-dialog-link`, `@c15t/tanstack-start/components/consent-dialog-link` and their `c15t/next` and `c15t/tanstack-start` equivalents now export only `ConsentDialogLink`. They pointed at the whole adapter entry, so importing the link pulled in the rest of the adapter.

### Resolve unknown locations on static pages with the manifest's own policy

`createStaticConsentResolver` from `@c15t/tanstack-start/static` now starts a visitor with no known location on the manifest's unknown-location policy (its `fallback` pack, else its `default` pack), as `@c15t/nextjs/static` already did and as server rendering does when location headers are missing. It previously picked the strictest pack in the manifest and applied it to everyone, including packs scoped to other countries. A manifest with no fallback or default pack now resolves to a failed `insufficient-inputs` result, and the client applies its safe fallback.

Geo data that isn't a non-empty string, such as a numeric `country` or a blank `regionCode` from the geo endpoint, now counts as an unknown location. It previously reached the policy resolver and could end up in `location.countryCode`. String values are trimmed.

The static resolver now lives in `@c15t/core/static` (also available as `c15t/static`), and both framework `static` entries re-export it. `resolveStrictestDefaultInit` is renamed to `resolveUnknownLocationInit`. The old name still works in `@c15t/nextjs/static` and `@c15t/tanstack-start/static` and is marked deprecated.

### Ship a c15t skill and the v3 guides in every package

Each package now ships a `SKILL.md` next to `AGENTS.md`, telling coding agents
how to pick a setup, which rules to follow and how to verify consent, with
links into the bundled Markdown. `@c15t/core`, `@c15t/react`, `@c15t/nextjs`,
`@c15t/scripts`, `@c15t/browser`, `@c15t/integrations` and `@c15t/cli` publish
it for the first time.

The bundled docs follow the rewritten v3 guides: concept pages, a setup
chooser, a full page set for every framework, and a new HTML guide for the
script tag in `@c15t/browser`. `@c15t/iab` points its homepage and README at
the new IAB page.

## @c15t/nextjs@3.0.0-alpha.3 (alpha)

### Encode and enforce IAB publisher restrictions

Configure TCF publisher restrictions with `publisherRestrictions` on `createIAB`, `IABProvider`, the runtime's `iab` options or the Astro integration's `iab` options. c15t writes them into the TC string's `PubRestrictions` section, decodes them from stored strings, and reports them through `__tcfapi('getTCData')` as `publisher.restrictions`. Previously that map was always empty and configured restrictions were not encoded.

Consent-gated scripts, network rules and iframes with a `vendorId` now apply the confirmed restrictions: type 0 blocks the purpose, type 1 requires consent and type 2 requires legitimate interest for purposes the vendor list marks as flexible. Accept all grants the vendor signal a restriction needs. Legitimate interest a restriction introduces applies until the visitor objects, so Save Settings encodes it as allowed, matching what the preference centres show.

The React, Vue, Svelte and `@c15t/browser/iab` preference centres list each vendor under the legal basis the restrictions leave it, so a vendor moved to legitimate interest gets an objection control instead of a consent toggle. A purpose whose vendors all use legitimate interest shows no consent switch, only the objection, and display-model rows report this as `hasConsentBasis`. Such a purpose no longer decides its c15t category, so a granular save no longer records a denial that blocks its legitimate-interest vendors; legitimate interest never grants a category on its own. Custom UIs can use `applyPublisherRestrictionsToGVL` from `@c15t/iab/headless` or pass `publisherRestrictions` to `processGVLForDialog`.

IAB gates no longer let a refused c15t category block a target that uses only legitimate interest after publisher restrictions. Such a target needs no consent under TCF, so its purpose and vendor legitimate interest signals, and the visitor's objection, decide. Previously every restriction on a referenced category blocked IAB targets; GPC, opt-out directives and strict scope still do, and the refused category still blocks scripts that name only the category or declare a consent purpose.

Unsupported restrictions throw `PublisherRestrictionError` instead of being dropped. This covers reserved type 3, vendors or purposes missing from the vendor list, legitimate interest for purposes 1 and 3 to 6, basis changes on purposes the vendor does not declare as flexible, conflicting types for one vendor, and restrictions in a string that is not service-specific. `whenReady()`, `save()` and `generateTCString()` reject, and no TC string is written. Retrying `whenReady()` does not fetch another vendor list. With an explicit `gvl`, the error lasts for the handle and saving keeps failing even if the kernel later holds a different list; a CMP following the kernel's list checks a replacement list again. When a replacement vendor list makes a restriction unsupported, the TC authority confirmed under the previous list is cleared. Whenever the CMP withdraws its own authority, including on expiry, it also removes the `euconsent-v2` cookie and localStorage entry. A stored TC string whose restrictions differ from the configuration is not restored; the banner opens again for a returning visitor and closes once they save, IAB gates stay denied until then, and the superseded `euconsent-v2` cookie and localStorage entry are removed. Decoding a string written under TCF policy version 2 or 3 accepts legitimate interest required for purposes 3 to 6, which those versions allowed.

### Keep open tabs in step with stored consent

A choice saved in one tab now reaches the other open tabs on the same origin
without a reload. Before, a tab kept a grant after another tab stored a denial,
and neither `kernel.refresh()` nor `runtime.reinit()` read storage again.

Browser persistence reads stored records again when another tab on the same
origin changes a c15t localStorage key, when the page becomes visible and when
the window regains focus. A tab on another subdomain that shares the consent
cookie gets no `storage` event and catches up on its next focus or visibility
change, and so does every tab when localStorage is unavailable and only the
cookie is stored. Category decisions merge per category, keeping the newer decision for
each, and privacy directives merge as a union. A stored notice or vendor record
replaces the one in memory unless it is older. A record removed from storage is
cleared, so the active policy decides again. Blocked storage or bytes that do
not decode change nothing. Reconnecting does not read storage.

Queued writes follow the same rules. A tab lands its own pending write before it
reads, a choice write stores the per-category merge with what storage holds, a
directive write keeps every stored directive, and the rewrite that adds a
server subject id no longer recreates records another tab cleared. When two
tabs act in the same millisecond, the record stored first wins in both. A
tab that opened before another stored a subject joins the stored subject
unless it identified a different user; a subject id the server resolved is
kept unless a strictly newer stored choice carries another one. Only a
record this tab saw in storage is cleared when it disappears, so a choice
seeded while storage was blocked survives storage becoming readable.

Under an IAB policy, `@c15t/iab` loads the TC string another tab stored once
its choice is reconciled, with its purpose, vendor and special-feature
selections, so `__tcfapi` and the preference controls no longer show the
previous choice. Selections changed in this tab without saving are kept. A
TC string that grants any purpose of a category denied after it was saved
is withdrawn and not restored on the next page load; a partial purpose
selection saved through IAB keeps its TC string. A TC string confirmed before
the reconciled choice's newest decision, such as after a save on a sibling
subdomain that shares the consent cookie, is withdrawn as well, since the TC
string and its receipt belong to one origin. A newer receipt replaces the held
one even when the TC string is identical.

Clearing records now stores the clear epoch, the time of the clear, under
`c15t-epoch` in localStorage and a cookie of the same name, and clearing never
removes it. Every consent record written afterwards records its epoch too.
Decisions confirmed before the epoch are void everywhere: a tab that reconciles
after another tab cleared and saved again drops its pre-clear decisions, a tab
that missed the clear cannot write them back, and browser hydration and server
reads (`readStoredRecordsFromCookieHeader`) ignore them. A decision in the
clearing millisecond counts only from a tab that had seen the clear. Each clear
moves the epoch forward even after the clock went back, and an epoch up to an
hour ahead of the clock is kept. Records from before any clear, including v2
and legacy records, read as epoch 0 and are unaffected; a corrupt epoch also
reads as 0, and a record whose epoch field is corrupt is kept.

The consent cookie stays authoritative, but a denial in its localStorage copy
that is newer than the cookie's decision is now applied on top of it, so a
dropped cookie write no longer keeps an older grant in force. Copies written
under different clear epochs are cut to the later epoch first, and the
subject comes from the later copy. Privacy directives from both copies of the
privacy record apply, a newer local vendor list adds denials without lifting
any (a vendor copy from before the last clear is ignored), and the newer notice
dismissal applies. A newer local
grant is still not applied.

This changes the stored format: after a clear, the consent cookie gains
`&e=<time>` (16 bytes) and the localStorage record an `epoch` field (22 bytes).
Visitors who never cleared store what they did before. Older c15t builds reject
both the cookie and the localStorage record once they carry the epoch and treat
the visitor as undecided, so under an opt-out policy they grant optional
categories by default until a new choice is saved. Deploy the new build to every
page of the site before visitors can clear their records.

When two tabs write at the same moment and one write drops the other tab's
category or directive, the tab that lost it writes it back on its next
reconciliation, including directives it kept from storage in its own write.
Under an IAB policy, a TC string that grants a category a
reconciled denial covers is withdrawn before any `__tcfapi` listener is
notified, and one that predates another tab's newer choice is held back until
this tab reads that tab's receipt, so a revoked vendor is never advertised
again. A tab reloads the TC string when another tab stores a new receipt, which
covers a save in the same millisecond or one that changed only vendors, and
stops publishing the held one until the reload decides. Two receipts from the
same millisecond settle on the more restrictive one, so a revoked vendor is
never advertised again; when each grants something the other denies, the
stored receipt is removed and neither is published until the next save. When
another tab removes the receipt or clears localStorage, the held TC string is
withdrawn, and a receipt still being decoded is not installed. localStorage
has no conditional removal, so the removal after a tie can still delete a
receipt another tab stored a moment earlier; every tab then withholds its TC
string until the next save.

A page seeded from a server's cookie read applies newer denials and privacy
directives that reached only localStorage, and a local denial from the same
millisecond as a seeded grant, and a clear after the clock went
back more than an hour writes an epoch other tabs can still read. That capped
epoch cannot void decisions dated after it that a runtime which missed the
clear writes back; times alone cannot order a clear against a clock that went
back more than an hour. When the cookie and its localStorage copy hold
conflicting decisions from the same millisecond, the denial wins. The
subject comes from the cookie, which a server-side restoration or a sibling
subdomain can rewrite on its own, unless this browser's last write reached
only localStorage and the cookie has not changed since; such a write leaves a
`<storageKey>-cookie-miss` marker in localStorage. A localStorage write that
fails while the cookie write lands removes the older local copy.

New API:

- `runtime.reconcileStorage()` and `persistence.reconcile()` read stored
  records on demand and return whether anything changed. React's
  `usePersistence()` handle has `reconcile()` too.
- `persistence: { sync: false }` keeps storage but turns off the automatic
  reads. `dispose()` removes the listeners.

See [keep open tabs in step](https://c15t.com/docs/guides/consent-state#keep-open-tabs-in-step).

### Render theme CSS on the server

**Breaking.** The browser no longer generates theme CSS. `ConsentProvider` (and `ConsentRoot`) used to turn `options.theme` tokens into a `<style id="c15t-theme">` element on every page, so every visitor downloaded the theme generator and the default theme, about 1.7 KB gzip. The package stylesheet already carries the default tokens, so the provider now renders no theme style at all.

Render custom tokens with the new `ConsentTheme` component, exported from `@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start` and the `c15t/react`, `c15t/next` and `c15t/tanstack-start` entries. It is not a client component: render it from a Server Component and the generator stays on the server. `ConsentTheme` takes `theme`, `colorScheme` (`'light'`, `'dark'` or `'system'`, applied before hydration) and `nonce`. `generateThemeCSS()` from `@c15t/ui/theme` now escapes `<`, so its output is safe inside a `<style>` element wherever you render it.

`@c15t/svelte`'s provider no longer injects the token CSS after hydration, which also removes the one-frame flash of default colors in SvelteKit. `@c15t/astro` now renders the integration's `theme` tokens on the server, next to the config script, instead of leaving them to the dialog islands.

### Migration

- **Next.js App Router.** Move the theme to a module without `'use client'`. Render `<ConsentTheme theme={theme} />` in the root layout (a Server Component) next to your consent wrapper, and pass `colorScheme` and `nonce` there if you set them on `ConsentRoot`. Keep `options.theme` on `ConsentRoot` only for `consentActions` and slot styles.
- **Next.js Pages Router.** Render `ConsentTheme` in `pages/_document.tsx`.
- **TanStack Start.** Return `generateThemeCSS(theme)` from a `createServerFn` handler in the root loader and render it in a `<style id="c15t-theme">` in the head. Rendering `ConsentTheme` in the root component also works but ships the generator.
- **React without server rendering.** Render `ConsentTheme` next to the provider (this ships the generator), or put the output of `generateThemeCSS(theme)` in your stylesheet.
- **SvelteKit.** Return `generateThemeCSS(theme)` from `+layout.server.ts` and render it inside `<svelte:head>`. Keep slot styles and `consentActions` in `options.theme`.
- **Astro.** Keep tokens in the integration's `theme`. Tokens in the client entrypoint's `theme` are no longer applied.
- **Light and dark at runtime.** Render `ConsentTheme` without `colorScheme` and toggle the `dark` class on `<html>` (for example with next-themes): its output holds both schemes. The provider's `colorScheme` option still keeps the `c15t-dark` class in sync after hydration.
- **Switching token sets at runtime.** Render `ConsentTheme` from a client component and change its props.
- Keep importing the package stylesheet. It holds the default tokens the provider used to inject.

In development, the provider warns when `theme` holds tokens but the page has no `c15t-theme` stylesheet.

### Keep dialog CSS out of the render-blocking stylesheet

**Breaking.** `styles.css` now carries only what a first paint can show: the default tokens, every c15t CSS variable, and the rules for the banner, `ConsentDialogTrigger` and the `ConsentGate` placeholder. It shrinks from 125 KB to 66 KB (16.2 KB to 8.8 KB gzipped). The dialog and preference-widget rules moved to `@c15t/ui/styles/dialog.css`, which the dialog's module imports, so your bundler ships them with the dialog's lazy chunk and applies them before the dialog renders. In a Next.js production build the page's stylesheet drops from 18.2 KB to 10.6 KB gzipped.

- `@c15t/ui/styles.css` and `styles.tw3.css` no longer contain the dialog, preference widget, accordion, switch, tabs, collapsible, preference item or vendor list rules. React, Next.js and TanStack Start load them for you. If you render `@c15t/ui` class maps for those parts in your own components, import `@c15t/ui/styles/dialog.css`.
- `@c15t/react/primitives` and every `@c15t/react/primitives/*` entry load the dialog stylesheet, because the accordion, collapsible, preference item, switch and tabs rules moved there.
- JavaScript loads the dialog rules through the new `@c15t/ui/styles/dialog` module. Bundlers follow its import of `styles/dialog.css`; under the `node` export condition it imports nothing, so plain Node (the Pages Router, or SSR that keeps dependencies external) can load every `@c15t/react` entry. Import it instead of the `.css` file from components that can run on the server.
- The rules for the `@c15t/ui/styles/primitives` class maps moved to `@c15t/ui/styles/primitives.css`. The React components never used them. `c15t/svelte/styles.css` imports them; other hosts that render those class maps import the file themselves.
- `iab/styles.css` no longer repeats the default tokens and the shared rules. Import it after `styles.css`, as the IAB guides already say.
- Tailwind 3: the dialog stylesheet goes through your PostCSS pipeline, and Tailwind 3 rejects its `@layer components` block. Add `@c15t/ui/postcss-tailwind3` before `tailwindcss` in your PostCSS plugins. Without it the build fails with "`@layer components` is used but no matching `@tailwind components` directive is present".
- If you import `styles.css` into a named layer (`@import '…/styles.css' layer(c15t)`), the dialog rules still join the top-level `components` layer.

Svelte, Astro, Vue and the script-tag build render the same styles as before. `c15t/svelte/styles.css` still holds every rule, because Svelte loads its dialog with the page. Astro injects the banner rules; the React and Svelte dialog islands import the rest, which Astro links on every page, and with `ui: 'vue'` the integration injects them. If you set `styles: false` with `ui: 'vue'`, also import `@c15t/ui/styles/dialog.css`. `@c15t/browser` inlines the dialog rules as before.

### Load offline mode on demand in ConsentRoot

`ConsentRoot` in `@c15t/nextjs` and `@c15t/tanstack-start` picks its transport at runtime and imported `offline()` statically, so every app that rendered it shipped offline mode's recommended policy-rule pack in its initial client JavaScript, even with a backend URL, where offline mode never runs. `ConsentRoot` now loads offline mode on first init, and only when no backend URL is set. In production builds of each quickstart's setup, initial JavaScript drops by 8,949 bytes (3,560 bytes gzip) on Next.js 16 and by 28,396 bytes (9,759 bytes gzip) on TanStack Start. A root without a backend still resolves the recommended rules, after loading one extra chunk.

### `ConsentGate` mounts a granted embed after hydration

**Breaking.** With the App Router's awaited `resolveConsent` layout, a returning visitor
who had allowed the category downloaded a `ConsentGate` iframe twice. The
page streams inside a `Suspense` boundary, and React moves that HTML into
place after the browser has parsed it. The browser starts loading the
iframe during parsing and loads it again after the move.

`ConsentGate` no longer puts granted children in the server HTML. A denied
category still gets the placeholder there. A granted category gets the empty
wrapper, and its children mount once hydration completes, so the iframe loads
once in every layout. Client-side renders mount the children at once, as
before.

### Migration

- Server HTML for a granted `ConsentGate` no longer contains its children.
  Tests or crawlers that read the embed from the server response need to wait
  for hydration.
- Size the wrapper with `className` or `style` so the page keeps the embed's
  space while it mounts.

### Prerender pages that render `ConsentGate`

With Next.js `cacheComponents: true`, `next build` failed on a page that
rendered `ConsentGate` in its prerendered shell, because the gate called
`Date.now()` during server rendering. The server render and hydration now
evaluate the gate at the snapshot's own evaluation time. In the browser the
gate still checks the current time, so an expired grant never shows the
embed.

The page needs no `Suspense` boundary around `ConsentGate`: a static page
stays static, and its prerendered HTML contains the placeholder instead of
an empty fallback. `useVendorAllowed` gets the same change.

### Server rendering no longer waits on a slow or failing consent backend

`resolveConsent` in Next.js and TanStack Start, and server rendering in Nuxt, now wait at most `timeoutMs` (500 ms by default) for the visitor's policy. Before, a backend that never answered held an awaited layout blank for the manifest cache's 10 second timeout. When the budget runs out, the page renders without consent UI in the server HTML, optional categories stay denied and consent-gated scripts and iframes stay blocked. The browser then resolves the policy and shows the banner once the backend answers. The manifest request keeps running and fills the cache for the next request.

The server manifest cache now remembers a failed request when nothing usable is cached. It waits 1 second before asking the backend again, doubling up to 5 seconds while failures continue; requests in between fail at once with a `ManifestUnavailableError`. Before, every request after a cold failure went to the backend. Concurrent requests still share one upstream request, and a stale copy is still served only inside the backend's `stale-while-revalidate` window. The upstream request timeout drops from 10 to 5 seconds.

Next.js `resolveConsent` reads the manifest through the in-process cache whatever `manifestURL` points at. A warm render no longer makes a request to your own manifest route, and a `manifestURL` pointing at the backend no longer fetches it on every render.

The Nuxt init route no longer falls back to the backend's `/init` for every request while the manifest is backing off. It still falls back when the backend has no `/manifest` endpoint.

### Migration

- Pages whose backend takes longer than 500 ms on a cold cache now render the banner after hydration on that request instead of in the server HTML. Raise `timeoutMs`, or set `timeoutMs: false` to wait as before, up to the new 5 second request timeout.
- Pass `waitUntil` to Next.js `resolveConsent`, or `onBackgroundRevalidate` to TanStack Start `resolveConsent`, so serverless platforms keep a manifest request alive after the render stops waiting for it.
- Code that retried the manifest cache in a loop after a failure now receives `ManifestUnavailableError` with `reason: 'backoff'` until the retry floor passes. Its `retryAfterMs` says when the next attempt is allowed.
- Next.js `resolveConsent` now refuses to forward `forwardHeaders` credentials to a plain `http://` manifest URL on a host other than loopback, matching the route handlers; the render falls back to the baseline state and reports the error.

### Load the hosted init path only when init runs

`ConsentRoot` no longer ships the hosted transport's init code to every page. With server-resolved `state`, the browser never runs init, but the root's first load carried the inline-prefetch reader, the init-response mapper and the subject-record reviver: about 1.1 KB of gzipped JavaScript in a Next.js App Router app. Saves, identity links and privacy directives now go through a record-only transport, and the init path loads on the first init. `POST /subjects` still goes out without waiting for a chunk, with the same body and decision assertion. The same applies to manifest mode's record requests.

When the browser does run init (a static export with `state={{}}`, cookie-only state, or a server that could not resolve the state), the `/init` request goes out together with the chunk request, so the banner does not wait an extra round trip.

`@c15t/core` exports `createHostedRecordTransport()`, the save, identify, subject-read and privacy-directive half of `createHostedTransport()`. `custom()` now lives in its own module, so an app that brings its own transport no longer bundles the hosted transport through it. A hosted transport loads the subject-record reviver on the first `loadSubjectRecord()` call.

### Send the first manifest-mode save without loading the resolver

With `ConsentRoot` and a `manifestURL` config, the first consent save no longer downloads the manifest resolver and every translation before it posts. When the server already resolved the visitor's state, the browser never runs init, so `POST /subjects` goes out right away with the same body, including the policy id, fingerprint, country, region, language and GPC signal the backend checks. A preferences dialog now closes as soon as that request returns, instead of waiting for about 64 KB of gzipped JavaScript first. When the browser does resolve init from the manifest, saves keep using that resolver as before.

### Remove `useConsentManager()`

**Breaking.** `useConsentManager()` is no longer exported from `@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start`, their `/headless` entries, or the `c15t/react`, `c15t/next` and `c15t/tanstack-start` umbrella entries. The undocumented `useConsentManagerDraft()` on `@c15t/react/draft` is gone with it. The hook subscribed to the whole consent snapshot, so each caller re-rendered on every change. Read each field through its own hook, which re-renders only when that value changes.

`useSubscribeToConsentChanges()` and `useRegisterConsentCategories()` are now exported from the main entries as well as `@c15t/react/hooks`.

| `useConsentManager()` field | Replacement |
| --- | --- |
| `activeUI`, `setActiveUI` | `useActiveUI()` (can be `null`), `useSetActiveUI()` |
| `has(category)` | `useConsent(category)` |
| `consents`, `effectivePermissions`, `explicitChoice` | `useConsents()`, `useEffectivePermissions()`, `useExplicitChoice()` |
| `promptRequirement`, `noticeDismissal`, `privacySignals`, `optOutDirectives`, `restrictions` | `usePromptRequirement()`, `useNoticeDismissal()`, `usePrivacySignals()`, `useOptOutDirectives()`, `useRestrictions()` |
| `resolution`, `policyRule`, `policyScopeMode` | `usePolicyResolution()`, `usePolicyRule()`, `usePolicyScopeMode()` |
| `policyCategories` | `usePolicyCategories()` (without the leading `'necessary'`) |
| `policyBanner`, `policyDialog` | `usePromptPresentation()`, `usePreferencesPresentation()` |
| `model`, `branding` | `useModel()`, `useBranding()` (both can be `null`) |
| `iab`, `vendors`, `vendorChoice` | `useIABSnapshot()`, `useDeclaredVendors()`, `useVendorChoice()` |
| `getDisplayedVendors(category)` | `useDeclaredVendors()` filtered by category |
| `subscribeToConsentChanges`, `updateConsentCategories` | `useSubscribeToConsentChanges()`, `useRegisterConsentCategories()` |
| `translationConfig` | `useTranslations()` |
| `selectedConsents`, `setSelectedConsent`, `selectedVendors`, `setSelectedVendor`, `resetDraft`, `draftIsStale` | `useConsentDraft()`: `values`, `set`, `vendors`, `setVendor`, `reset`, `isStale` |
| `consentCategories`, `consentTypes`, `getDisplayedConsents()` | `useConsentDraft().displayedCategories` with `useTranslations().consentTypes` |
| `saveConsents('all' \| 'necessary' \| 'custom')` | `useHeadlessConsentUI().performAction('accept' \| 'reject' \| 'save')` |
| `manager` | Nothing; it was always `null` |

Render components that stage choices with `useConsentDraft()` and save them with `useHeadlessConsentUI()` inside one `ConsentDraftProvider`, so both use the same draft.

`c15t codemods use-consent-manager-to-hooks` rewrites common destructuring forms. Fields it cannot rewrite stay on a `useConsentManager()` call under a `TODO(c15t v3)` comment naming the replacement.

The stock dialog, preference rows, vendor lists, dialog trigger and `ConsentGate` now read only the values they render. Toggling one category in the preferences dialog re-renders that category's row instead of every row.

## @c15t/nextjs@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Session reports from manifest mode

A host that resolves init from a cached manifest never calls `/init`, so the backend could not count the visitors it served. Every server-side resolution now sends `POST /sessions` to the backend after the fact, server-to-server and detached from the response: the Next.js, TanStack Start, SvelteKit, Nuxt and Astro init routes, and the Next.js, TanStack Start and Astro render-time prefetches. The report carries the manifest revision, the matched policy, the jurisdiction, country, region, language and GPC signal. The visitor's user agent travels as `User-Agent` and the visitor's single client address on a dedicated `X-C15T-Client-IP` header, which the backend masks and records under its `ipAddress` settings; the forwarding chain itself is not sent, and neither are cookies. The browser makes no request.

`@c15t/backend` adds the `POST /sessions` route and a `sessions.onReport` option. Reports are written to the request's wide event and handed to the sink; nothing is stored. The backend's own `/init` emits the same event, so one sink sees hosted and manifest traffic alike.

Reports are handed to the same `onBackgroundRevalidate` hook as a background manifest refresh, so a host that already passes `after` or a platform `waitUntil` needs no change. `resolveConsent` in `@c15t/nextjs/server` gains `waitUntil` for the App Router. Set `reportSessions: false` on any adapter to send none. `createManifestTransport` in `@c15t/core` gains a `report` option; `@c15t/schema` adds `consentSessionReportSchema` and `buildConsentSessionReport`.

### Rename `Frame` to `ConsentGate`

`Frame` is now `ConsentGate` in React, Next.js, TanStack Start and Svelte, and Vue's `ConsentFrame` is now `ConsentGate`. The compound parts follow: `ConsentGate.Root`, `ConsentGate.Title` and `ConsentGate.Button`, with `ConsentGateProps` and `ConsentGateCompoundComponent` types. New subpaths are `c15t/react/consent-gate`, `c15t/react/components/consent-gate` and `@c15t/vue/runtime/components/consent-gate.vue`, and Nuxt auto-registers `<ConsentGate>`.

The old names, subpaths and Nuxt component remain as deprecated aliases for the same component. Props, behavior, `frame.*` translation keys, `--frame-*` CSS custom properties and `data-testid="frame-placeholder"` are unchanged.

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the `vendors` option or the backend manifest, then name them with `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and its vendor is not off; `alwaysLoad` scripts see the result in their callbacks.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte list each category's vendors with a switch per vendor. Switches edit the draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. React adds `useVendorDraft`, `useVendorAllowed`, `useDeclaredVendors` and `useVendorChoice`; `useConsentDraft` gains `vendors` and `setVendor`; the Svelte manager state gains `selectedVendors` and `setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and reach the backend as `vendorChoice`. Migration `4-vendor-choice` adds the column, so run the migrator before deploying. A denial has no expiry and does not delete cookies the vendor already set.

Also fixed: the Vue preference center rendered its switches and category rows unstyled in Nuxt, and the Vue and Svelte category description colour differed from React's.

### Remove dialog scheduling delays and preserve IAB actions

Remove first-open scheduling delays from React's aggregate dialog, widget, and compound components while preserving server rendering and hydration. Keep children mounted when an external runtime provides IAB context, so loading the bridge cannot reset local drafts.

Remove the extra Suspense delay from Astro's React IAB dialog island.

Queue external-runtime IAB actions until the runtime publishes its handle, and reject pending saves with AbortError when the borrowing provider unmounts. Correct the React and Next.js peer dependency ranges to require React and React DOM 18 or newer, matching the APIs already used by v3. Upgrade both React packages before using v3 on an older installation.

# @c15t/nextjs

## 3.0.0-alpha.1

### Minor Changes

- dd44a61: Add opt-in `clearOnRevocation` configuration to remove declared cookies, localStorage keys, and sessionStorage keys when their consent category is denied or revoked. Support exact names, prefix patterns, and cookie scopes while protecting c15t consent records.

### Patch Changes

- 46f45c4: Render theme CSS in the server HTML to prevent React and Next.js consent banners from flashing default styles before hydration. Preserve the stylesheet and CSP nonce through hydration, and escape theme values so HTML-like strings remain inside the stylesheet.

  Apply explicit dark mode and system color preferences before hydration while preserving client-side theme updates.

  Reduce the theme generator's initial JavaScript and generated CSS size without changing theme tokens or contrast colors.

- Updated dependencies [dd44a61]
- Updated dependencies [46f45c4]
  - @c15t/core@3.0.0-alpha.1
  - @c15t/react@3.0.0-alpha.1

## 3.0.0-alpha.0

### Major Changes

- 4460e3e: This v3 alpha is for internal use only. APIs are unstable, and breaking changes will occur between alpha releases.

  Introduce the c15t umbrella package, shared consent runtime and policy rules, rewritten backend, and new framework and script-tag integrations. Update the CLI, IAB support, DevTools, and shared styles for v3.

  Packages now ship ESM only. Keep related packages on compatible v3 alpha versions.

  Export `defineTheme` and the `Theme` type from the React, Next.js, TanStack Start, and Vue entries so themes can use the same imports as their framework integration.

  Restrict iframe-blocker URL activation to HTTP and HTTPS. Replace backtracking URL and theme parsing expressions, correct the PostHog hostname boundary, and fix CLI layout detection for nested route groups and locale directories.

  Serve a stale consent manifest from the server adapters' in-process cache inside the backend's `stale-while-revalidate` window while one background request revalidates it, instead of blocking every request after `s-maxage` expires; a failed or timed-out revalidation keeps the stale manifest. The backend sends its manifest cache policy as `CDN-Cache-Control` too, so Vercel's CDN forwards it. Add `onBackgroundRevalidate` to the core cache and every server adapter for runtimes that stop detached work after the response.

### Patch Changes

- Updated dependencies [4460e3e]
  - @c15t/core@3.0.0-alpha.0
  - @c15t/react@3.0.0-alpha.0
  - @c15t/schema@3.0.0-alpha.0
  - @c15t/translations@3.0.0-alpha.0

## 2.2.0-canary-20260731105620

### Patch Changes

- Updated dependencies [c187c9d]
  - @c15t/react@2.2.0-canary-20260731105620
  - c15t@2.2.0-canary-20260731105620

## 2.2.0-canary-20260727202135

### Minor Changes

- b032a69: Add `ConsentDialogTriggerToolbar` to React and Next.js as an opt-in, draggable toolbar with app-owned actions and exactly one built-in consent preferences action. The existing `ConsentDialogTrigger` remains unchanged.
- 0c97773: Add consent-aware Google Maps and YouTube components for React and Next.js,
  plus `useConsentScript` for building custom SDK integrations.

  - `GoogleMap` keeps the Maps JavaScript API off the page until consent, shares
    one page-level loader across map instances, supports retries and loader
    configuration, and provides accessible blocked, loading, and error states.
  - `YouTubeEmbed` keeps the iframe unmounted until consent and provides a
    responsive, privacy-enhanced embed with type-safe URL configuration.
  - Add customizable `frame.loading` and `frame.error` messages for integration
    loading and failure states.

### Patch Changes

- 16a1f82: Dependency audit for the next release: remove unused `@orpc/*` dependencies from `@c15t/backend` and `@c15t/node-sdk`, update runtime dependencies (hono 4.12.27, valibot 1.4.2, defu 6.1.7, jose 6.2.3, zod 4.4.3, zustand 5.0.14, xstate 5.32.4, and more), and force security floors for kysely (SQL injection fixes) and protobufjs via workspace overrides. Builds now use TypeScript 7 (native compiler) with rslib 0.23 for type checking and declaration emit; emitted types are semantically unchanged.
- Updated dependencies [1d24803]
- Updated dependencies [05b0abb]
- Updated dependencies [b032a69]
- Updated dependencies [16a1f82]
- Updated dependencies [c8690f9]
- Updated dependencies [ace6760]
- Updated dependencies [c7e53ff]
- Updated dependencies [ace6760]
- Updated dependencies [e4315bd]
- Updated dependencies [ace6760]
- Updated dependencies [5406a8d]
- Updated dependencies [0c97773]
- Updated dependencies [ca7784f]
- Updated dependencies [30cb116]
- Updated dependencies [c8690f9]
  - @c15t/translations@2.2.0-canary-20260727202135
  - @c15t/react@2.2.0-canary-20260727202135
  - c15t@2.2.0-canary-20260727202135

## 2.1.0

### Minor Changes

- 4a89092: Expanded the script loader with a registry-backed provider system and a much
  broader set of consent-aware integrations. New helpers cover analytics,
  advertising pixels, functional tools, and tag managers, including Ahrefs,
  Cloudflare Web Analytics, Fathom, Hotjar, Matomo, Microsoft Clarity, Mixpanel,
  Plausible, PromptWatch, Rybbit, Segment, Umami, Vercel Analytics, Reddit Pixel,
  Snapchat Pixel, and Crisp/Intercom.

  Provider manifests now share common utilities for script URL resolution, boolean
  data attributes, install-step builders, Google consent mapping, and lifecycle
  execution. The package also includes registry metadata, focused provider tests,
  and engine coverage so script helpers resolve predictable loader URLs,
  attributes, consent callbacks, and queued vendor calls.

  Google Tag and Google Tag Manager boot timestamps now resolve during script
  lifecycle execution instead of helper construction, which keeps documented setup
  patterns compatible with Next.js Cache Components prerendering.

  PostHog now supports explicit EU/US region selection, keeps the bootstrap script
  host aligned with an explicit API host, and exposes loading modes for immediate
  cookieless consent sync, consent-gated loading, or disabling the helper without
  issuing a PostHog network request.

  Updated the docs and CLI generation prompts so these providers are discoverable
  from the integration docs and script-loader setup flows.

### Patch Changes

- Updated dependencies [1588a24]
- Updated dependencies [4a89092]
  - @c15t/translations@2.1.0
  - c15t@2.1.0
  - @c15t/react@2.1.0

## 2.0.4

### Patch Changes

- Updated dependencies [748536a]
  - c15t@2.0.4
  - @c15t/react@2.0.4

## 2.0.3

### Patch Changes

- Updated dependencies [10cec50]
  - @c15t/react@2.0.3

## 2.0.2

### Patch Changes

- 50e17f0: Fix Tailwind CSS v3 stylesheet packaging so package resolvers that do not follow nested CSS imports still include the generated c15t component rules.

  Root `styles.tw3.css` and `iab/styles.tw3.css` proxy entrypoints are now published, and the React/Next.js Tailwind v3 dist stylesheets inline the generated UI CSS instead of forwarding through nested package imports.

- Updated dependencies [50e17f0]
- Updated dependencies [50e17f0]
  - @c15t/react@2.0.2

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - c15t@2.0.0
  - @c15t/react@2.0.0
  - @c15t/translations@2.0.0

## 2.0.0-rc.12

### Patch Changes

- aa2bb42: Fix consent switch sizing so it renders consistently in Tailwind and non-Tailwind apps.

  - `@c15t/ui`: make the shared switch primitive use an explicit `border-box` layout, size its track independently of host box-model resets, and clip the track so the thumb ring does not bleed past the edge.
  - `@c15t/react`: publish the updated prebuilt consent UI styling so React consumers pick up the normalized switch sizing.
  - `@c15t/nextjs`: publish the updated stylesheet bridge so Next.js installs pick up the normalized switch sizing as well.

- Updated dependencies [aa2bb42]
  - @c15t/react@2.0.0-rc.12

## 2.0.0-rc.10

### Patch Changes

- Updated dependencies [64d6009]
- Updated dependencies [79ae8cf]
- Updated dependencies [9579b62]
  - @c15t/react@2.0.0-rc.10
  - c15t@2.0.0-rc.10

## 2.0.0-rc.9

### Patch Changes

- 59b850b: Harden the prebuilt consent-surface branding against host-page CSS so the INTH and c15t wordmarks stay correctly sized across docs, marketing sites, and other embedded app shells.

  - `@c15t/react`: wrap both prebuilt full-logo branding paths in shared internal wordmark containers instead of attaching sizing classes directly to the raw `svg` elements.
  - `@c15t/ui`: move the logo constraints onto the internal branding wrappers and nested `svg` elements, adding explicit flex, max-width, block-layout, and aspect-ratio rules so global host-page `svg` styles cannot blow up or collapse either wordmark.
  - `@c15t/nextjs`: keep the published styled surface behavior aligned with the hardened React/UI branding path used by the prebuilt consent banner and dialog components.

- Updated dependencies [59b850b]
  - @c15t/react@2.0.0-rc.9

## 2.0.0-rc.8

### Patch Changes

- 5956531: Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

  - `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
  - `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
  - `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
  - `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

- cd9c830: Fix the `PolicyActions` DX regressions and the published stylesheet packaging for the prebuilt consent UI.

  - `@c15t/ui`: deduplicate policy-action helper ownership behind `c15t`, normalize widget footer subgroup naming, and add direct coverage for action-group flattening.
  - `@c15t/react`: share the internal `PolicyActions` renderer across banner and widget, add `consentAction` to policy-action render props so stock overrides preserve built-in theming, restore the banner default footer layout when policy hints do not provide a layout, and extend regression coverage.
  - `@c15t/nextjs`: keep the published stylesheet bridge files aligned with the package entrypoints and publish-artifact guard.

- 05db767: Align the styled package install path around app-level CSS entrypoints instead of JS-side stylesheet imports.

  - `@c15t/react`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/react/styles.css` or `styles.tw3.css` from a global CSS file, with explicit guidance on why this avoids layer-order debugging problems.
  - `@c15t/nextjs`: update the published README guidance, quickstart docs, and stylesheet usage comments so styled and IAB installs consistently import `@c15t/nextjs/styles.css` or `styles.tw3.css` from `app/globals.css`, with explicit guidance on why this avoids layer-order debugging problems.
  - `@c15t/cli`: move the stylesheet codemod and scaffold behavior to mutate global CSS entrypoints, remove old JS-side stylesheet imports, share the CSS-entrypoint mutation logic between generate and codemod flows, and add regression coverage for Tailwind v3/v4, IAB, dry-run, and missing-CSS cases.

- fee82fd: Refine prebuilt consent-surface branding so it feels attached to the UI instead of appended.

  - `@c15t/react`: add attached branding tags to the stock consent banner, consent dialog, IAB banner, and IAB dialog; localize the branding copy through translations; and add a `hideBranding` prop to the stock `ConsentBanner` component.
  - `@c15t/nextjs`: keep the published stylesheet entrypoints aligned with the updated prebuilt branding treatment while simplifying stylesheet distribution to reference upstream package styles directly.
  - `@c15t/ui`: update the shared consent branding tag styles for tighter edge attachment, smaller visual footprint, and consistent banner/dialog treatment across standard and IAB surfaces.
  - `@c15t/translations`: add the shared localized branding copy used by the updated prebuilt consent surfaces.

- Updated dependencies [43f1b68]
- Updated dependencies [3d4c107]
- Updated dependencies [c944e35]
- Updated dependencies [5956531]
- Updated dependencies [918a70e]
- Updated dependencies [cd9c830]
- Updated dependencies [05db767]
- Updated dependencies [fee82fd]
  - c15t@2.0.0-rc.8
  - @c15t/react@2.0.0-rc.8
  - @c15t/translations@2.0.0-rc.8

## 2.0.0-rc.7

### Patch Changes

- Updated dependencies [ec30bd1]
  - @c15t/react@2.0.0-rc.7

## 2.0.0-rc.6

### Patch Changes

- 5c8ee05: feat(styles): ship explicit stylesheet entrypoints for prebuilt UI

  - Publish explicit `styles.css` and `iab/styles.css` entrypoints for prebuilt UI in `@c15t/ui`, `@c15t/react`, and `@c15t/nextjs`
  - Update docs and CLI setup so stylesheet imports and Tailwind host-app configuration are explicit
  - Support the documented Tailwind 3 and Tailwind 4 layering model without requiring `!important`
  - Add automated first-paint CDP benchmark (`benchmarks/vite-react-repro/scripts/run-first-paint-bench.ts`)

  **Bundle impact (vite-react-repro):**

  - JS: 435.5 KB → 361.0 KB (-74.5 KB raw, -13.4 KB gzip / -11%)
  - CSS: 0.8 KB → 49.2 KB (moved from JS to CSS — net gzip saving: -6.5 KB / -5%)
  - `createElement("style")` runtime calls: eliminated
  - JS heap: -143 KB (-8%)

  **Main-thread impact (6x CPU throttle, 3 runs × 60 samples):**

  - JS evaluation: 64.5 ms → 53.1 ms (-11.4 ms / -17.7%)
  - Total → first paint: 87.8 ms → 76.5 ms (-11.3 ms / -12.9%)

- Updated dependencies [e08e52c]
- Updated dependencies [5c8ee05]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6
  - @c15t/react@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- 021ac99: Bundle version-matched docs inside published c15t packages under `docs/**` for local agent and developer reference.

  Remove CLI `AGENTS.md` generation. Use the bundled package docs directly alongside c15t agent skills.

- 5f30a3b: Add browser prefetch utilities for faster consent banner visibility

  - New `buildPrefetchScript()` and `getPrefetchedInitialData()` in `c15t` core to start the `/init` request before framework hydration
  - New `C15tPrefetch` component in `@c15t/nextjs` using `next/script` with `beforeInteractive` strategy for static-route-compatible prefetching
  - Tuned default motion tokens (fast: 80ms, normal: 150ms, slow: 200ms) and replaced hardcoded CSS durations with theme variables

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- 45f1a34: fix(nextjs): cache initial data requests
- Updated dependencies [021ac99]
- Updated dependencies [5f30a3b]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [58fb392]
- Updated dependencies [60a51f1]
- Updated dependencies [372cf92]
  - c15t@2.0.0-rc.5
  - @c15t/react@2.0.0-rc.5
  - @c15t/translations@2.0.0-rc.5

## Unreleased

- Bundle version-matched docs in the published package under `docs/**` for local developer and agent reference.

## 2.0.0-rc.4

### Patch Changes

- Updated dependencies [06ee724]
- Updated dependencies [0a42b31]
- Updated dependencies [29819bc]
  - @c15t/translations@2.0.0-rc.4
  - @c15t/react@2.0.0-rc.4
  - c15t@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- Updated dependencies [de6dd82]
- Updated dependencies [1c813bc]
- Updated dependencies [0f10f3e]
  - @c15t/react@2.0.0-rc.3
  - c15t@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- Updated dependencies [408df0e]
- Updated dependencies [e6bc5db]
- Updated dependencies [684bf2a]
  - @c15t/react@2.0.0-rc.2
  - c15t@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/translations@2.0.0-rc.1
  - @c15t/react@2.0.0-rc.1
  - c15t@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - c15t@2.0.0-rc.0
  - @c15t/react@2.0.0-rc.0
  - @c15t/translations@2.0.0-rc.0

## 1.8.3

### Patch Changes

- Updated dependencies [6c28663]
  - @c15t/react@1.8.3

## 1.8.3-canary-20260109181827

### Patch Changes

- @c15t/react@1.8.3-canary-20260109181827

## 1.8.3-canary-20251222100111

### Patch Changes

- @c15t/react@1.8.3-canary-20251222100111

## 1.8.3-canary-20251218133143

### Patch Changes

- Updated dependencies [226f45c]
  - @c15t/react@1.8.3-canary-20251218133143

## 1.8.2

### Patch Changes

- Updated dependencies [2ce4d5a]
  - @c15t/react@1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- @c15t/react@1.8.2-canary-20251212163241

## 1.8.2-canary-20251212112113

### Patch Changes

- Updated dependencies [7284b23]
- Updated dependencies [dfd5e4f]
  - @c15t/react@1.8.2-canary-20251212112113

## 1.8.2-canary-20251210222051

### Patch Changes

- Updated dependencies [a03d607]
  - @c15t/react@1.8.2-canary-20251210222051

## 1.8.2-canary-20251210105424

### Patch Changes

- Updated dependencies [3eb3f4a]
  - @c15t/react@1.8.2-canary-20251210105424

## 1.8.1

### Patch Changes

- @c15t/react@1.8.1

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/react@1.8.0
  - @c15t/translations@1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 69d6680: feat: country, region & language overrides

### Patch Changes

- 31953f4: refactor: improve package exports ensuring React has same exports as core
- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [31953f4]
- Updated dependencies [221a553]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [69d6680]
  - @c15t/react@1.8.0-canary-20251112105612
  - @c15t/translations@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Patch Changes

- 37561e1: fix(nextjs): missing certain headers on non-rewrite requests
- ccf32a2: fix(nextjs): client side options re-render
- 2ad1ff3: fix(nextjs): missing InitialDataPromise type export for pages
- Updated dependencies [067c7af]
- Updated dependencies [a0fab48]
  - @c15t/react@1.8.0-canary-20251028143243

## 1.7.0

### Patch Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/1.7.0
- Updated dependencies [aa16d03]
  - @c15t/react@1.7.0
  - @c15t/translations@1.7.0

## 1.7.0-canary-20251014174050

### Patch Changes

- Updated dependencies [87ce89f]
  - @c15t/react@1.7.0-canary-20251014174050

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- 3b787d7: refactor(nextjs): headless export
- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
  - @c15t/translations@1.7.0-canary-20251012181938
  - @c15t/react@1.7.0-canary-20251012181938

## 1.6.1

### Patch Changes

- Updated dependencies [6257a20]
  - @c15t/react@1.6.1

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/react@1.6.0
  - @c15t/translations@1.6.0

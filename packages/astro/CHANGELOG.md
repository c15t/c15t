## @c15t/astro@3.0.0-alpha.10 (alpha)

### Stop c15t's stylesheet holding back the first paint

The stylesheet apps imported for c15t was linked from `<head>`, and the
browser painted nothing until it downloaded. On a throttled phone, a Next.js
page with a banner first painted at about 650 ms instead of 370 ms. Now the
stock surfaces bring their own styles, and no c15t stylesheet request comes
before the first paint.

- **React, Next.js and TanStack Start.** `ConsentBanner`,
  `ConsentDialogTrigger`, `ConsentGate`, `ConsentDialog` and `ConsentWidget`
  render the c15t rules they use as `<style>` elements. A server-rendered
  banner puts them in the HTML. The dialog's rules ship with the dialog's
  code. React 19 moves them into `<head>` and renders each once; with the
  provider's `nonce`, or in React 18, they render next to the surface and
  carry the nonce.
  `IABConsentBanner` and `IABConsentDialog` deliver their IAB rules the same
  way, including the shared styles a standalone dialog needs.
  Streamed React IAB banners wait for their complete markup before becoming
  visible, so the centered card does not shift while its content arrives.
- **Svelte and SvelteKit.** The surfaces add their rules to `<head>` in the
  browser. On a server-rendered SvelteKit page, `c15tHandle` writes the
  banner's rules into the HTML.
  IAB banners and dialogs also deliver their own styles.
- **Astro.** The integration no longer adds `c15t/astro/styles.css` to every
  page. `<ConsentScript />`, or the banner on a layout without it, inlines the
  first-paint rules, including IAB when configured, and Astro's CSP config gets their hash. The dialog's
  rules load when a dialog first opens. A site on Tailwind CSS 3 keeps the
  linked stylesheet, which its PostCSS build has to process.

Remove the `styles.css` import from your app. If you keep it, the page looks
the same, but the stylesheet still holds the first paint and its rules load
twice. To keep importing it, for Tailwind CSS 3 or a named cascade layer, set the new
`styles: false` option on the provider (`ConsentRoot`'s `options` in Next.js
and TanStack Start). A nonce-based `style-src` needs the provider's `nonce`,
or `styles: false`.

`@c15t/ui` adds `@c15t/ui/styles/sheets/first-paint`, `dialog` and
`primitives`, plus `iab-first-paint` and `iab-dialog`, which export those rules
as strings. `dialog.css` and `iab-dialog.css` are available in the same
directory for deferred loading. The aggregate stylesheets remain available.

The setup CLI omits aggregate CSS imports for adapters that deliver their own
styles. Tailwind CSS 3 setups keep manual imports and disable automatic styles.

### Throw when an IAB policy reaches a site without `iab`

When a visitor's policy used the `iab` model and the backend sent its vendor
list, a site without `iab` ran the IAB model with no CMP to answer for it:
Accept recorded nothing. The server render now throws an
`IABUnavailableError` (code `C15T_IAB_UNAVAILABLE`), and a page the browser
resolves itself throws it there as an uncaught error. Set `iab` in the
integration options, or remove the `iab` model from the policy. A backend that
answers `gvl: null` turns IAB off for the request, and nothing throws.

The page script also no longer carries the CMP mount and the lazy `@c15t/iab`
loader, about 1.7 KB minified, unless `iab` is set.

### Astro: `c15t()` with no options, one consent route and a components barrel

`c15t()` now works with no options. The backend URL defaults to
`PUBLIC_C15T_BACKEND_URL`, read from the environment or `.env` in the project
root, and the mode defaults to `manifest()`. `PUBLIC_INTH_PROJECT_URL` works
too when `PUBLIC_C15T_BACKEND_URL` is unset. The modes are the data factories
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

## @c15t/astro@3.0.0-alpha.7 (alpha)

### Show the consent banner at once, and fade it in only when it arrives late

The banner and the IAB banner no longer slide or scale in on a spring curve.
A banner that shows with the page is part of the first paint, where the
overshoot read as layout shift, so it now appears on its first frame. The
backdrop of a blocking banner appears with it.

A banner that arrives more than 100ms after the page first painted, such as
after a slow script or a client-side init, fades in instead of popping into a
page someone is already reading. It fades over `--c15t-duration-normal` on
`--c15t-easing-out` and never moves. Its root and backdrop carry
`data-entry="late"`, and `--consent-banner-entry-duration` and
`--consent-banner-entry-timing` (`--iab-consent-banner-entry-*` for the IAB
banner) set the fade. A banner rendered on the server always shows at once.
`@c15t/ui/utils/late-entry` exports the check as `isLateEntry`.

Hiding still fades the banner out where it did before, now without the slide
or scale, and on an ease-in curve so it speeds up as it leaves.
`disableAnimation` turns both fades off.

Add the `--c15t-easing-in` theme token, set with `motion.easingIn`. It defaults
to `cubic-bezier(0.55, 0.055, 0.675, 0.19)` and sets the banner's exit curve.

## @c15t/astro@3.0.0-alpha.6 (alpha)

### Build Next.js Pages Router apps without `transpilePackages`

A Next.js app with only a `pages/` directory builds with c15t's stock dialog.
Before, webpack builds failed with "Global CSS cannot be imported from within
node_modules" unless the app set `transpilePackages`, and Turbopack failed on
linked installs.

`styles.css` includes the preference dialog and widget rules again, and no
`@c15t/react` or `@c15t/ui` module imports CSS. The render-blocking stylesheet
grows by about 4.5 kB gzip.

`@c15t/ui/styles/dialog.css`, the `@c15t/ui/styles/dialog` module and
`c15t/astro/dialog.css` are now empty. They still resolve, so existing imports
keep building. Remove them.

### Add IAB Global Privacy Platform support

Every framework can install the GPP 1.1 CMP API (`__gpp`) and keep its GPP
string in step with the visitor's choices.

- React, Next.js and TanStack Start: render `ConsentGPP` from `@c15t/react/gpp`
  (`c15t/react/gpp`) inside the consent provider or `ConsentRoot`.
- Vue, Nuxt, Svelte, SvelteKit and Astro: set the `gpp` option. `gpp: true` uses
  the defaults.
- `@c15t/browser`: call `mountGPP(client)` from `@c15t/browser/gpp`, or load
  `c15t.gpp.js` next to the main script tag.
- `createConsentRuntime()` takes `gpp` with
  `loadGPP: () => import('@c15t/iab/gpp')`, and `createGPP()` from
  `@c15t/iab/gpp` mounts the API on any consent kernel.

The GPP code loads only when you use it.

The matched policy rule picks the section. An `iab` rule maps the TC String to
`tcfeuv2`. A rule with the `preferences` or `opt-out` right gives US visitors
their state section, or the US National section when the state is unknown or has
none. `usFallback: 'none'` turns that fallback off and `usApproach: 'national'`
always uses it. Indiana, Kentucky, Maryland and Rhode Island are not encoded yet
and get the fallback.

If another CMP already owns `__gpp`, c15t leaves it in place. The `gpp` option
reports the conflict to `onError`, `ConsentGPP` logs it, and `mountGPP()` and
`createGPP()` throw.

### Closing the dialog brings back a banner the visitor still owes

Closing preferences with Escape, `closeUI()` or `closeDialog()` left no banner
and no dialog, even when the policy still required a choice. Closing the dialog
leaves the same surface a save would. The banner returns while a choice or
notice is owed. `showConsentSurface(kernel, 'none')` follows the same rule while
the dialog is open.

`useHeadlessIABConsentUI()` from `@c15t/react/iab` no longer flashes the banner
while the TC string encodes. The Vue dialog no longer handles one Escape press
twice.

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

## @c15t/astro@3.0.0-alpha.5 (alpha)

### Ship the script loader only to pages with scripts

Svelte, SvelteKit, Astro and the `@c15t/browser` npm entries now load the script loader as a separate chunk, only when `scripts` is not empty. A page without scripts or network blocker rules ships about 4 KB of gzipped JavaScript less.

Pages that do configure them still get the code without an extra request:

The script loader and the network blocker share one chunk, so a page with scripts and blocker rules fetches one file, and a returning visitor's held requests are decided when their scripts start. A page with only one of them downloads both.

- **SvelteKit:** add `c15tPreload()` from the new `@c15t/svelte/vite` entry to `vite.config.ts`. `c15tHandle` then adds one `<link rel="modulepreload" fetchpriority="low">` for that chunk to every page whose provider has scripts or blocker rules, prerendered pages included. Low priority lets the app's own chunks go first; the runtime needs the chunk only after hydration. The link carries the provider's `nonce`, else the nonce SvelteKit put on its own scripts. Without the plugin, scripts load one request after the app's JavaScript.
- **Astro:** a site that configures `scripts` (or a `clientEntrypoint`, which may add some) keeps the script loader in its boot script; `networkBlocker` rules in the integration options do the same for the blocker. A site with neither never downloads them.
- **`@c15t/browser`:** the script-tag builds (`c15t.js` and friends) are unchanged. With the npm package, the chunk loads when c15t starts; your bundler names it (it starts from `@c15t/core/dist/modules/loader-and-blocker.js`), so add your own `modulepreload` with `fetchpriority="low"` for it if returning visitors' scripts must start sooner.

`@c15t/core/runtime/on-demand` exports `createConsentRuntimeWith(options, modules)`, a configure-once runtime that mounts the module factories you choose, and `mountRuntimeIAB`, next to `onDemandRuntimeModules`. It is separate from `@c15t/core/runtime/provider`, so a provider that loads modules through its own `import()` calls gets no unused chunks from it under esbuild, and a page that configures once gets none of the provider runtime's. The new `@c15t/core/runtime/on-demand-factories` entry (`c15t/runtime/on-demand-factories`) exports each on-demand factory on its own (`scriptLoaderOnDemand`, `networkBlockerOnDemand`, `clearOnRevocationOnDemand`, `connectConsentSourceOnDemand`), for a host that imports some modules statically and loads the rest on demand; the first two each load a chunk with only their module. Astro uses them, so a site with `scripts` keeps the script loader in its boot chunk instead of a chunk of its own.

**Breaking.** `boot()` from `@c15t/astro/client`, called without the integration, no longer mounts a script loader, network blocker or `consentSource` connection itself; the integration's page script registers them. Called on its own with `scripts`, `networkBlocker` or `consentSource` in its options, it throws. Add the `c15t()` integration to `astro.config` for those pages, or leave those options out of a standalone `boot()`.

### Every adapter closes consent surfaces the same way

Accept, reject and save now decide which surface shows next through one module in `@c15t/core`, so React, Vue, Nuxt, Svelte, Astro and `@c15t/browser` behave alike:

- After a choice, the banner shows only while the policy still owes a choice or a notice. A choice saved while the policy is still loading, or after it failed to resolve, no longer brings the banner back in Vue, Nuxt and `@c15t/browser`.
- A banner reopened for a visitor who already chose now closes once the new choice is recorded in React and Svelte, as it already did in `@c15t/browser`.
- On Astro, `acceptAll()`, `rejectAll()` and the banner's Accept and Reject buttons go through the IAB CMP under an IAB policy, so the TC string records the choice. Before, they saved categories only. `acceptAll()`, `rejectAll()` and `save()` now also close an open banner or dialog once the choice is recorded.

The rules are public at `c15t/surface-actions` (`@c15t/core/surface-actions`) for custom UI: `hasConsentUI()`, `hasConsentPreferences()`, `showConsentSurface()`, `saveConsentSurface()`, `saveIABConsentSurface()` and `saveConsentBlanket()`.

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

## @c15t/astro@3.0.0-alpha.4 (alpha)

### Apply `theme.slots` to the Astro banners and dialog islands

`<ConsentBanner />` and the banner the browser renders on prerendered pages now read `theme.slots` for their parts: `consentBanner`, `consentBannerCard`, `consentBannerHeader`, `consentBannerTitle`, `consentBannerDescription`, `consentBannerFooter`, `consentBannerFooterSubGroup`, `consentBannerRights`, `consentBannerRightLink`, `consentBannerTag`, `consentBannerOverlay`, `buttonPrimary` and `buttonSecondary`. Before, the banner read only `theme.consentActions`, so classes and styles set there were ignored. A slot's classes follow the stock ones, its `style` renders inline, and `noStyle: true` on a slot replaces that part's stock classes.

`<IABConsentBanner />` and its browser-rendered copy read `iabConsentBanner`, `iabConsentBannerCard`, `iabConsentBannerHeader`, `iabConsentBannerFooter`, `iabConsentBannerTag`, `iabConsentBannerOverlay`, `buttonPrimary` and `buttonSecondary` the same way.

The preference and IAB dialogs now honor `theme.slots` with `ui: 'react'` and `ui: 'vue'` too. Those islands style parts through the provider's `components` option, so the integration translates each slot to its `components` entry (`consentDialogCard` to `dialog.card`, `toggle` to `switch.root`, and so on). A slot's `noStyle` flag has no `components` equivalent there: its classes apply on top of the stock ones. The Svelte island already read `theme.slots`.

Numeric slot `style` values get `px` where the property takes a unit (`{ padding: 8 }` renders `padding:8px`), and unitless properties such as `opacity` or `zIndex` keep the bare number. The banners now apply the assigned experiment arm's `theme.slots` and `consentActions` over the host theme's, on the server and in the browser-rendered copy. The browser-rendered copy also applies the arm's `presentation`, as the server render already did.

### Accept every banner prop on `ConsentBannerDeferred`

`ConsentBannerDeferred` now accepts `dismissButtonText` and `hideBranding` in its prop types. It already passed them to `ConsentBanner`, but `astro check` rejected them.

### Resolve a relative backendURL against the request, not forwarding headers

A relative `backendURL` or `manifestURL` no longer resolves against client-controlled forwarding headers. The server helpers previously built the backend origin from `x-forwarded-host`, `x-forwarded-proto` or `referer` when present, so a request that set them could make the server send its `/init` or manifest request, with the request's cookies and forwarded headers, to another host.

A relative URL now resolves against the URL the framework resolved the request under (`event.url` in SvelteKit, `request.url` in Next.js route handlers, TanStack Start and Astro), or against the `host` header where no request URL exists (Next.js `resolveConsent`, `fetchSSRData`). A bare `host` resolves over `https` for a domain name and over `http` for `localhost`, an IP address, or a single-label host such as `app:3000`. The `referer` header is no longer used.

Apps behind a proxy that sets forwarding headers and drops incoming ones can opt back in with `trustForwardedHeaders: true` on SvelteKit `loadConsent` and `resolveConsent`, Next.js `resolveConsent`, `createNextConsentRouteHandlers` and `createPagesApiHandlers`, and `@c15t/react/server` `fetchSSRData` and `normalizeBackendURL`, matching the existing TanStack Start option. The rule lives in `resolveRequestBackendURL` and `resolveRequestOrigin`, new exports of `@c15t/core/server`, which every server adapter now shares. With the option set, the forwarded host and the forwarded scheme apply independently, so a proxy that keeps `host` and only sets `x-forwarded-proto` or `x-forwarded-ssl` still decides the scheme.

The SvelteKit and `@c15t/react/server` helpers also stop passing the client's `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers to the backend, including when `forwardHeaders` names them in SvelteKit. `extractRelevantHeaders` in both packages leaves them out unless called with `{ trustForwardedHeaders: true }`. `fetchSSRData` still makes its `/init` request when those headers are the only ones besides `host`; it just does not forward them.

`resolveBackendURL` from `@c15t/schema/types` is deprecated in favor of `resolveRequestBackendURL`. It now follows the same rule by default: it reads only the `host` header, and ignores `x-forwarded-*` and `referer` unless its new third argument is `{ trustForwardedHeaders: true }`, which restores the previous resolution order. The forwarded values are now validated like `host`: the first entry of a comma-separated list is used, a scheme other than `http` or `https` is ignored, and a host that is not a bare authority resolves to `null`.

### Export the Astro dialog stylesheets

With `styles: false`, import the preference dialog's rules from `@c15t/astro/dialog.css` (`c15t/astro/dialog.css` in the umbrella package). The Svelte dialog also needs `@c15t/astro/primitives.css` (`c15t/astro/primitives.css`). You no longer need to install `@c15t/ui` to import `@c15t/ui/styles/dialog.css` and `@c15t/ui/styles/primitives.css`.

```css
@import 'c15t/astro/styles.css';
@import 'c15t/astro/dialog.css';
@import 'c15t/astro/primitives.css';
```

### Apply `theme.slots` in React and Vue

`theme.slots` now styles the stock parts in React and Vue, as it already did in Svelte, Astro and the script tag. Each slot maps onto the matching `components` part (`consentDialogCard` onto `dialog.card`, `toggle` onto `switch.root`), and `components` wins where both set the same attribute. A slot with `noStyle: true` drops that part's stock classes and keeps the slot's and the part's own classes, as in the other adapters; a slot that sets only `noStyle` applies too. React used to accept `theme.slots` in its types and ignore it.

The `frame` and `consentDialogFooter` slot keys are removed: no adapter read them. Style the stock dialog's footer with `consentWidgetFooter`, and the `ConsentGate` placeholder with the new `consentGate` slots.

In Vue, the assigned experiment arm's `theme.slots` merge over the host theme's, as they already did in React, so an arm that changes only a slot renders its classes and styles.

A numeric length in a slot style, such as `{ padding: 8 }`, now renders as `8px` in Vue too. Vue writes style objects as given, so the number used to be dropped.

### Show only necessary when a site declares no categories

A site that declares no categories, through `consentCategories`, scripts, network rules, vendors or discovered frames, now offers only Strictly necessary under a permissive policy, as in v2. The banner still appears when the policy asks for a choice. Accept all, Reject all and Save each record an acknowledgement that keeps the banner dismissed after reload, and hosted and manifest modes send a consent receipt for necessary alone. The acknowledgement expires with the policy's choice validity or a policy change, and a category declared later asks again. Strict policies and IAB TCF policies still offer their whole scope.

The Astro server now judges a visitor against the categories the page's `consentCategories`, `scripts` and network rules declare, so it renders the same banner decision as the browser. Browser `hasConsented()` and the `after-consent` trigger treat the acknowledgement as a decision.

In React Native, the Swift and Kotlin cores apply the same rule when the app sets no `consentCategories`: a permissive policy offers only Necessary, any save records the acknowledgement and sends the necessary-only receipt, and strict policies still offer their whole scope. A declared list now also narrows what Accept all and Reject all confirm, as on the web.

### Start the banner's entry from the stylesheet, and keep the collator off the init path

Canonical sets and fingerprint keys were sorted with
`String.prototype.localeCompare`, whose first call initialises the ICU
collator on the main thread before the banner can show. They now use a
comparator that applies the same root-collation order to printable ASCII
directly and only falls back to the collator for other strings, so every
fingerprint stays byte-identical.

Every framework also started the banner's entry transition its own way: the
script tag and Svelte inserted the hidden state, forced a layout and flipped
the class; React rendered hidden and flipped after a timer; Vue handed the
flip to `Transition`; Astro's prerendered banner did not animate at all.
`@c15t/ui` now carries the entry as `@starting-style` states, the
`bannerEntering`, `overlayEntering`, `dialogEntering` and `contentEntering`
classes, and each framework renders the banner in its visible state with the
entering class. The transition runs from the first frame with no hidden
render or layout read, and it runs the same way whether the banner arrives
from the server or the client. Astro's prerendered banner now fades in at
first paint like the others. Browsers without `@starting-style` show the
banner in place; the script tag keeps its class flip for them.

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

### Keep the Astro color scheme when a dialog opens

With `colorScheme: 'dark'` or `'system'`, opening the preference dialog with `ui: 'react'` removed `c15t-dark` from `<html>` unless the page also had a `dark` class, so the banner and dialog turned light. The dialog islands now leave the class to the page's colour-scheme setting. The provider option types in `@c15t/react` and `@c15t/ui` now accept `colorScheme: null`, which the providers already treated as "leave the class alone".

Set `colorScheme: 'none'` when your site's own theme switch sets `c15t-dark`. c15t then emits no colour-scheme script and never adds or removes the class, on boot, after ClientRouter navigations or when a dialog opens.

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

### Keep c15t styles above Tailwind v4 preflight

The layered stylesheets (`styles.css`, `styles/dialog.css`, `styles/primitives.css` and `iab/styles.css`) and `@c15t/astro/styles.css` now open with Tailwind v4's layer order, `@layer properties, theme, base, components, utilities;`. Cascade layers rank by the order they are first named, so a page that loaded c15t's stylesheet before Tailwind's put `components` below Tailwind's `base`, and preflight removed the banner's padding and borders. This happened on Astro sites using Tailwind v4, where the integration injects c15t's stylesheet first, and in apps that import c15t's stylesheet above their own. The order now holds whichever sheet loads first.

Without Tailwind the extra layers stay empty. If your CSS declares its own layer order, load that statement before c15t's stylesheet. The `.tw3.css` files are unchanged, and `@c15t/ui/postcss-tailwind3` removes the statement for Tailwind 3.

### Apply theme.consentActions to the Astro banner

`<ConsentBanner />` now reads `consentActions` from the integration's `theme` and sets each button's mode and variant in the same order as the React banner: the action's own key, then `primary` for the policy's primary action, then `default`. Before, every button was a stroke button and only the primary action got the primary variant. The banner the browser renders on prerendered hosted and manifest pages uses the same styles.

On a notice, the acknowledgement button is now the primary action when it is the only button, as it is in the React and Svelte banners.

### Accept `colorScheme: null` in Astro

The integration's `colorScheme` accepts `null` with the same meaning as `'none'`: c15t neither sets nor clears `c15t-dark` on `<html>`. `null` is the value the React, Vue and Svelte providers use for this, so a shared config works in all of them. The default stays `'system'`.

### Fix IAB feature styling, accessibility, and Astro script escaping

Apply theme spacing and typography to the IAB feature section. Hide decorative
feature disclosure arrows from screen readers in Vue. Escape Astro client module
paths and adapter names when generating page scripts.

### Add `disableAnimation` to Astro

The integration accepts `disableAnimation`. It skips the banner's entry animation, in the server markup and in a banner the browser renders, and the dialog islands' enter and exit animations. `<ConsentBanner />`, `<IABConsentBanner />`, `<ConsentDialog />` and `<IABConsentDialog />` take the same prop to override it for one surface.

```astro
<ConsentBanner disableAnimation />
```

Left unset, animations play, and the stylesheet stops them for visitors who ask for reduced motion, as before.

### Require a backend URL in Astro manifest mode

`manifest()` without a `backendURL` now fails when `astro.config` loads, with an error that says where to set one. Before, only a `manifestURL` without a `backendURL` was caught. A bare `manifest()` built, then the browser posted every save to `/api/c15t/subjects`, where nothing answers, so consent was never recorded.

`C15T_BACKEND_URL` or `PUBLIC_C15T_BACKEND_URL`, when set as `astro.config` loads, still counts. Its value is now passed to the browser as well, so saves go to that backend. An inline `manifest` without a `backendURL` still builds. `backendURL: ''` counts as set: the browser posts saves to `/subjects` on the site's own origin, and the environment variables do not replace it. It gives the server no manifest to fetch, so pair it with a `manifestURL`, an inline `manifest` or `C15T_MANIFEST_URL`; without one, `astro.config` fails to load.

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

### Keep app `i18n.messages` overrides when the backend sends translations

In hosted and manifest mode, the translations from `/init`, from a server prefetch or from a manifest replaced the app's `i18n.messages` for the same language, so a key overridden in code showed the backend's copy instead. This affected React, Next.js and TanStack Start through the React provider, Svelte and SvelteKit (including `resolveConsent()` prefetches), Astro and `@c15t/browser`.

The backend copy is now the base for the visitor's language and the app's `i18n.messages` for that language are deep-merged over it. An app key replaces the backend's text when it differs from c15t's built-in copy for that language, or for its primary language. A key that repeats the built-in text does not hide the backend's copy, so an app that passes the stock bundles to enable languages, such as `{ ...baseTranslations.de }`, still shows edits made on the backend, while a customized key still wins. Keys the backend does not supply keep the app's copy, so a language the backend does not send still shows the app's copy in full. Overrides for other languages are not applied. A regional language such as `de-AT` uses the overrides under `de` when there is no `de-AT` entry.

Built-in copy is known for English and, once `@c15t/translations/all` has loaded, for every bundled language. Without it, every app key counts as a customization. `@c15t/translations` adds `getStockTranslations()` for this, and `/all` registers its languages when it loads. The package now lists `dist/all.js` under `sideEffects`, so a bare `import '@c15t/translations/all'` survives tree shaking.

Astro also deep-merges `i18n.messages` now. Before, a partial override such as `{ cookieBanner: { title } }` replaced the whole `cookieBanner` section and left its other keys empty. A regional `i18n.locale` or `Accept-Language` such as `de-AT` now renders over the `de` bundle instead of English.

`@c15t/core` now exports `offline()`, a mode for `createConsentRuntime()` that resolves policy rules locally. A language set through the kernel, with `overrides.language` or `kernel.set.language()`, switches the copy when c15t's built-in copy or `i18n.messages` has that language, falling back to the primary language, so `de-AT` uses German copy. Built-in copy covers English, and every bundled language once `@c15t/translations/all` has loaded. A language with no copy gets the startup copy back, still labelled with the startup language. The language a server prefetch detected from `Accept-Language` does not switch the copy until the app has asked for a different language. `@c15t/browser` uses this transport, so `data-language`, the `overrides.language` option and `setLanguage()` now switch the copy in offline mode. The Svelte `offline()` mode is unchanged. The JavaScript, Vue and Solid boilerplate from `@c15t/cli generate` now uses core's `offline()`, and the generated offline kernel config passes `translationsFor` with `baseTranslations` from `@c15t/translations/all`, so generated projects switch to any bundled language too. The CLI installs `@c15t/translations` for that config.

`createOfflineTransport()` accepts `translationsFor` and `detectedLanguage` options with the same behavior. Without `translationsFor` it still relabels its copy with the requested language, as before.

`@c15t/core` also adds a `translationOverrides` kernel option, the `applyTranslationOverrides()` and `resolveLocalTranslations()` helpers, and an optional `translationsFor` on the transport factory context.

### Support IAB TCF 2.4

c15t now follows TCF 2.4 and TCF Policies v5.0.b. Existing TC strings stay valid.

- The IAB preference centre shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- GVL schemas keep unknown fields, so `standardTexts` survives the backend cache.

### Migration

Headless IAB UIs: `resolveIABDialogDisplayModel` now returns Features in `featureRows` instead of `essentialRows`. Render them without a control, under `featuresStandardText` or your `features.description` translation when it is `null`.

### Support nonce- and hash-based Content Security Policies in Astro

Set `Astro.locals.c15t.nonce` from your own middleware, which runs after c15t's, and every inline `<script>` and `<style>` the c15t components render carries it. In the browser, the runtime puts the same nonce on the scripts its loader injects, on gated `type="text/plain"` scripts it activates, and on the dialog stylesheets it links.

```ts
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	const nonce = crypto.randomUUID();
	if (context.locals.c15t) {
		context.locals.c15t.nonce = nonce;
	}
	const response = await next();
	response.headers.set(
		'content-security-policy',
		`script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'`
	);
	return response;
});
```

With Astro's `<ClientRouter />` and a nonce generated per request, each page the router swaps in arrives with a new nonce, while the browser keeps enforcing the first page's policy. Before the swap, the runtime gives c15t's own inline scripts and theme stylesheet on the new page, and its gated `data-c15t-category` tags, the first page's nonce when they carry the incoming one, so c15t's inline code still runs and the gated tags still pass the nonce check. Other elements keep their nonce. c15t's inline scripts now carry a `data-c15t-inline` attribute for this. If the incoming page has config scripts with different nonces, as when markup injected into it plants a second one, the runtime changes nothing on that page and logs a warning.

`<ConsentBannerDeferred />` passes the page's nonce to its server island, because the page's policy is the one that applies to the markup the island inserts. `<ConsentBanner />` takes the same value as a `nonce` prop. Astro's own island loader is an inline script without a nonce, so a nonce-only policy still blocks the island until the policy allows that script too.

With Astro's own CSP turned on (`security.csp`, or `experimental.csp` in Astro 5), the integration adds the hashes of the colour-scheme script, the banner reveal scripts, the theme stylesheet and inline `scripts` entries to it. With an `experiment`, it hashes the theme stylesheet of every arm, since an arm's `theme` changes the stylesheet the banner renders. You no longer need `'unsafe-inline'`.

Inline `scripts` from a `clientEntrypoint` module are the one exception: that module only runs in the browser, so the integration cannot hash them when Astro loads the config. With Astro's CSP on, the browser now hashes each of them and logs a console error naming the script and the hash the policy lacks. Add that hash to `scriptDirective.hashes` in the `csp` config, or move a script that has no callbacks into the integration's `scripts` option, which c15t hashes for you.

The per-visitor boot payload now renders as a `<script type="application/json" data-c15t-config>` data block, which a policy does not need to allow, instead of a script that assigns `window.__c15tAstroConfig`. `buildConfigJSON()` from `@c15t/astro/server` builds it. A page that still sets `window.__c15tAstroConfig` with `buildConfigScript()` keeps working, and the runtime reads the nonce from that script when it has one.

Put the page's nonce on your own gated tags too: `<script is:inline type="text/plain" data-c15t-category="measurement" nonce={Astro.locals.c15t.nonce}>`. c15t activates a gated tag by creating a new `<script>`, and a policy with `'strict-dynamic'` runs a script that a trusted script creates without checking its nonce. So a tag injected into the page through an HTML-injection hole would run as soon as its category was granted. When the page has a nonce, the runtime activates only tags carrying it, with that nonce. It skips the others, marks them `data-c15t-activated="untrusted"` and logs a warning. Pages without a nonce behave as before.

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

### An undeclared vendor reads as not allowed

Breaking change: reading vendor consent for an id that no `vendors` entry, script slug or backend vendor list declares now returns `false`. Before, React's `useVendorAllowed`, Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` returned `true` for such an id without checking any category, so a typo or a missing declaration read as allowed before the visitor consented. In development, c15t logs one warning per undeclared id that names the missing declaration. Declare every vendor you read, for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The rule lives in one helper, `isVendorAllowed(snapshot, vendorId, now?)`, exported from `c15t` and `@c15t/core`. A declared vendor keeps its behaviour: it is allowed when its category condition passes and, outside an IAB policy, the visitor has not switched it off.

Vue gains `useVendorAllowed(vendorId)`, which returns a computed boolean and is auto-imported in Nuxt. The Svelte consent manager from `getConsentManager()` gains `isVendorAllowed(vendorId)`.

Scripts, iframes and network rules that carry an undeclared `vendor` slug are gated as before: they follow their category.

### Granular vendor consent in Astro and the script tag

Astro and `@c15t/browser` now support per-vendor consent like the other adapters. A visitor can allow a category and still turn one vendor off.

In Astro, pass `vendors` to `c15t()`. Vendors from the backend manifest are merged in. The preference dialog lists each category's vendors with a switch per vendor for the React, Vue and Svelte islands. The switches edit the draft and are saved with Save. They are disabled while the category is off and cleared by Accept all and Reject all. `getConsentClient()` gains `getDeclaredVendors()`, `getVendorChoice()` and `isVendorAllowed(vendorId)`, and `save()` accepts a `vendors` map. The server now asks about the categories that code-declared vendors sit in, so its banner decision matches the browser's.

In `@c15t/browser`, declare vendors with the `vendors` option or `c15t.push(['config', { vendors }])`. The stock preference centre lists vendor switches with the same behaviour and the `@c15t/ui` vendor list styles and translations. The client and `window.c15t` gain `getDeclaredVendors()`, `getVendorChoice()` and `isVendorAllowed(vendorId)`. `save()` now forwards a `vendors` map instead of dropping it, so `c15t.push(['save', { measurement: true, vendors: { posthog: false } }])` works. A change to vendors alone now emits `consent` and runs gated tags that were waiting.

Both adapters gate inert `<script type="text/plain" data-c15t-category="…">` tags by vendor when the tag also carries `data-c15t-vendor="…"`, and gate iframes that carry `data-vendor`. The nonce rule for gated tags is unchanged.

### Deep-merge `i18n.messages` in Astro

`i18n.messages` now merges each translation group key by key, as the other adapters do. Overriding `common.acceptAll` alone used to replace the whole `common` group, so every other button label rendered empty.

### Label Astro legal links and show them in the preference dialog

A legal link with no `label` in `legalLinks` now reads as the translated name for its type, such as "Privacy Policy" or "Datenschutzerklärung", instead of the raw key `privacyPolicy`. The React, Vue and Svelte banners already did this.

`<ConsentDialog />` takes a `legalLinks` prop with the same list `<ConsentBanner legalLinks>` takes, and passes it to the Svelte, React or Vue dialog island. Before, the Astro preference dialog never showed legal links.

```astro
<ConsentDialog legalLinks={['privacyPolicy', 'cookiePolicy']} />
```

## @c15t/astro@3.0.0-alpha.3 (alpha)

### Keep visitors' choices on prerendered Astro pages

A prerendered page no longer reads the build request's headers or cookie. The
page used to carry the build's empty consent record, which the browser
preferred over the visitor's stored cookie, so every reload asked again. The
browser now reads the visitor's own cookie. Astro's warning about reading
`Astro.request.headers` on a prerendered page is gone too.

### Explain why the injected Astro routes need an adapter

`manifest()` mode, or `endpoints: true` in any mode, injects on-demand init and
manifest routes. On a site with no server adapter, `astro build` stopped with a
generic "no adapter" error that never mentioned those routes. The integration
now fails the build first, names the routes, and says how to build statically.
`astro dev` and `astro sync` still run without an adapter, as Astro allows.

### Encode and enforce IAB publisher restrictions

Configure TCF publisher restrictions with `publisherRestrictions` on `createIAB`, `IABProvider`, the runtime's `iab` options or the Astro integration's `iab` options. c15t writes them into the TC string's `PubRestrictions` section, decodes them from stored strings, and reports them through `__tcfapi('getTCData')` as `publisher.restrictions`. Previously that map was always empty and configured restrictions were not encoded.

Consent-gated scripts, network rules and iframes with a `vendorId` now apply the confirmed restrictions: type 0 blocks the purpose, type 1 requires consent and type 2 requires legitimate interest for purposes the vendor list marks as flexible. Accept all grants the vendor signal a restriction needs. Legitimate interest a restriction introduces applies until the visitor objects, so Save Settings encodes it as allowed, matching what the preference centres show.

The React, Vue, Svelte and `@c15t/browser/iab` preference centres list each vendor under the legal basis the restrictions leave it, so a vendor moved to legitimate interest gets an objection control instead of a consent toggle. A purpose whose vendors all use legitimate interest shows no consent switch, only the objection, and display-model rows report this as `hasConsentBasis`. Such a purpose no longer decides its c15t category, so a granular save no longer records a denial that blocks its legitimate-interest vendors; legitimate interest never grants a category on its own. Custom UIs can use `applyPublisherRestrictionsToGVL` from `@c15t/iab/headless` or pass `publisherRestrictions` to `processGVLForDialog`.

IAB gates no longer let a refused c15t category block a target that uses only legitimate interest after publisher restrictions. Such a target needs no consent under TCF, so its purpose and vendor legitimate interest signals, and the visitor's objection, decide. Previously every restriction on a referenced category blocked IAB targets; GPC, opt-out directives and strict scope still do, and the refused category still blocks scripts that name only the category or declare a consent purpose.

Unsupported restrictions throw `PublisherRestrictionError` instead of being dropped. This covers reserved type 3, vendors or purposes missing from the vendor list, legitimate interest for purposes 1 and 3 to 6, basis changes on purposes the vendor does not declare as flexible, conflicting types for one vendor, and restrictions in a string that is not service-specific. `whenReady()`, `save()` and `generateTCString()` reject, and no TC string is written. Retrying `whenReady()` does not fetch another vendor list. With an explicit `gvl`, the error lasts for the handle and saving keeps failing even if the kernel later holds a different list; a CMP following the kernel's list checks a replacement list again. When a replacement vendor list makes a restriction unsupported, the TC authority confirmed under the previous list is cleared. Whenever the CMP withdraws its own authority, including on expiry, it also removes the `euconsent-v2` cookie and localStorage entry. A stored TC string whose restrictions differ from the configuration is not restored; the banner opens again for a returning visitor and closes once they save, IAB gates stay denied until then, and the superseded `euconsent-v2` cookie and localStorage entry are removed. Decoding a string written under TCF policy version 2 or 3 accepts legitimate interest required for purposes 3 to 6, which those versions allowed.

### Accept Astro 6 and 7

`@c15t/astro` now lists `astro` 5, 6 and 7 as peer dependencies, so package
managers stop warning when you install it into a current Astro project.

On the Cloudflare adapter for Astro 6 and later, background manifest refreshes
and session reports now use `waitUntil` from `Astro.locals.cfContext`. They
still use `Astro.locals.runtime.ctx` on Astro 5.

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

### Accept `networkBlocker` in the Vue plugin, Nuxt module and Astro integration

The plain Vue plugin started the network blocker when its options carried `networkBlocker`, but `C15tVuePluginOptions` did not include the option, so passing it was a type error. The plugin's options type now covers everything it starts on mount: `networkBlocker`, `iframeBlocker`, `scripts`, `storageConfig` and `nonce`. `RuntimeConsentConfig` and `UseNetworkBlockerOptions` are exported from `@c15t/vue/vue-plugin`.

The Nuxt module accepts `networkBlocker` in `nuxt.config.ts` under `c15t`, without `onRequestBlocked`, because module options reach the browser as JSON.

The Astro integration ignored network blocking entirely. It now takes `networkBlocker` in the integration options, and in the client extension when you need `onRequestBlocked`.

### Remove `skipPrefetch` from `resolveConsentContext`

`resolveConsentContext` no longer accepts `skipPrefetch`. Pass
`prerendered: true` for a render shared by every visitor. It ignores the
request, leaves visitor state out of the inlined config and still resolves
offline policies at build time.

### Stop Astro dialog islands shipping a second stylesheet

The dialog islands import `@c15t/ui` class maps, which import their component
CSS in the browser. Astro links every stylesheet a page script can reach, so
with `ui: 'svelte'` every page loaded about 72 KB of dialog CSS on top of the
injected stylesheet that already contains it. With `styles` on, the
integration now resolves those class maps to their variant without CSS. With
`styles: false` the islands keep their own CSS.

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and reload the page when the source withdraws a granted category, using the existing `reloadOnConsentRevoked` option and `onBeforeConsentRevocationReload` callback. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

Keep disabled runtimes permissive when an external source is configured. Complete browser readiness after connecting the source, keep Astro preference triggers available, and reject IAB saves owned by an external CMP. External permissions disable c15t IAB authority. Deliver events for built-in Umami, Rybbit and Matomo integrations, and preserve custom GTM queue names during initialization and dispatch.

Report external CMP subscription failures without aborting provider startup. Keep optional permissions denied and ignore notifications from the failed connection.

### Show the Astro banner on prerendered pages

`ConsentBanner` rendered nothing on a prerendered page, because the build had
no policy, and the browser could only show or hide a banner that was already in
the HTML.

- In `offline()` mode the build now resolves the policy and renders the banner
  hidden. The browser shows it to visitors who have not chosen yet.
- In `hosted()` and `manifest()` mode, `ConsentBanner` leaves a placeholder.
  The browser renders the banner there, with the same markup as the server
  version, once its init returns a policy that needs one. Returning visitors
  do not download the renderer.
- A banner hidden after a choice no longer stays on screen: the stylesheet
  now makes the `hidden` attribute beat the banner's own `display`.
- The CLI's Astro boilerplate no longer tells you to avoid prerendering.

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

### Ship Astro consent styles automatically

The quickstart said the integration supplies styles, but it did not. On the
server, the components read class names through the `node` export condition,
which imports no CSS, so the banner and dialog rendered unstyled unless you
imported the stylesheet yourself.

The integration now adds `@c15t/astro/styles.css` to every page, plus the new
`@c15t/astro/iab/styles.css` when `iab` is set. Remove your own import of the
stylesheet. Set `styles: false` to keep loading it yourself, for example from
a global stylesheet that orders its own cascade layers.

The CLI's Astro boilerplate no longer imports the stylesheet.

### Show the Astro IAB banner on prerendered hosted and manifest pages

`IABConsentBanner` rendered nothing on a prerendered page in `hosted()` or
`manifest()` mode, or whenever the server had no vendor list yet. It now leaves
a placeholder, and the browser renders the IAB banner there with the same
markup as the server version once the policy and vendor list arrive. Under an
IAB policy the browser picks the IAB banner over a `ConsentBanner` placeholder
on the same page.

### Reload the page when a visitor revokes consent

Revoking consent removed a vendor's script element but left its code running. Listeners, timers, history hooks and chat widgets kept working until the next full page load. v2 reloaded the page on revocation, and v3 lost that behaviour when the consent policy contracts were unified.

When an accept, reject or save turns off a category or vendor that was granted, the page now reloads after every in-flight save request settles, so the next page runs only permitted code. `onBeforeConsentRevocationReload` runs just before the reload. A first visit that rejects under opt-in does not reload, because nothing gated had run. Rejecting defaults under opt-out does, because gated code ran before the choice. Expiry, policy changes and privacy signals do not reload.

Set `reloadOnConsentRevoked: false` to turn this off. The option is available on `ConsentProvider`, `ConsentRoot` `options`, `createConsentRuntime()`, the Vue plugin config, the browser client, and the Astro integration. `@c15t/svelte` receives it through its runtime options.

### Keep offline mode out of the Astro page script for hosted and manifest sites

The page script the integration injects picks its transport at runtime, and it
imported the offline transport statically. Every hosted and manifest site
therefore shipped offline mode and its recommended policy-rule pack in the
script that runs on every page, where they never run: about 10 KB gzipped.
Offline mode now loads in its own chunk on the first browser init. An offline
page the server already resolved never inits, so it doesn't load the chunk
either.

### Astro server renders no longer wait on a slow or unreachable consent backend

The Astro middleware resolves consent before the page renders. In hosted mode it
called the backend's `/init` with no time limit, so a backend that never
answered held every server-rendered page open. In manifest mode a cold cache
waited for the manifest request's 10 second timeout. The middleware now waits at
most 500 ms. When that runs out the page renders without the server decision:
no banner in the HTML, optional categories denied, and consent-gated scripts and
iframes blocked. The browser then resolves the policy and shows the banner. A
manifest request keeps running, fills the cache for the next render, and is
handed to the adapter's `waitUntil` when there is one.

Set the budget with `middleware: { timeoutMs }` in the integration options, or
`timeoutMs` when calling `resolveConsentContext` yourself. `timeoutMs: false`
waits for the backend as before. `DEFAULT_RESOLVE_TIMEOUT_MS` is exported from
`@c15t/astro/server`.

### Migration

Sites whose backend takes longer than 500 ms to answer `/init` now get the
banner after the page loads instead of in the server HTML. Raise
`middleware.timeoutMs` above the backend's usual response time, or set it to
`false` to keep the old behavior.

### Start loading the Astro preference dialog on hover and focus

The preference dialog is an island that downloads the first time it opens, so
the first Customize click waited for the framework runtime and the dialog to
download. Pointing at or focusing a control that opens the preference dialog
now starts that download. With a mouse the dialog is usually there by the time
the click lands. Visitors who only accept or reject still download nothing,
and a failed download is retried on the next hover, focus or open.

### Add `c15t/astro` to the `c15t` package

Astro sites can install `c15t` and import `c15t/astro`, like `c15t/react`
and the other framework entry points. The named components are at
`c15t/astro/components/<name>.astro`, and the stylesheets at
`c15t/astro/styles.css` and `c15t/astro/iab/styles.css`.

To support it, `@c15t/astro`:

- exports `./components/consent-script.astro` by name, like its other
  components;
- resolves the entry points it hands to Astro (middleware, routes, the page
  script, the dialog islands and the stylesheets) to file paths, so a site
  installed with pnpm that only lists `c15t` still builds;
- keeps its stylesheet in one file, so the copy `c15t` ships stays
  self-contained.
- marks its `astro` peer optional, so installing `c15t` for React, Next.js,
  Vue or plain JavaScript does not pull in Astro.

### Show the offline Astro banner at first paint on prerendered pages

A prerendered banner ships hidden, because the same HTML serves visitors who
have already chosen. It used to stay hidden until the page's module scripts
loaded. An inline script after the banner now shows it straight away when the
visitor has nothing stored under any consent key, including a stored privacy directive. Blocked `localStorage` counts as nothing stored there. Visitors with a stored
record still wait for the runtime, which validates it. The new
`buildBannerRevealScript` helper is exported from `@c15t/astro/server`.

## @c15t/astro@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Session reports from manifest mode

A host that resolves init from a cached manifest never calls `/init`, so the backend could not count the visitors it served. Every server-side resolution now sends `POST /sessions` to the backend after the fact, server-to-server and detached from the response: the Next.js, TanStack Start, SvelteKit, Nuxt and Astro init routes, and the Next.js, TanStack Start and Astro render-time prefetches. The report carries the manifest revision, the matched policy, the jurisdiction, country, region, language and GPC signal. The visitor's user agent travels as `User-Agent` and the visitor's single client address on a dedicated `X-C15T-Client-IP` header, which the backend masks and records under its `ipAddress` settings; the forwarding chain itself is not sent, and neither are cookies. The browser makes no request.

`@c15t/backend` adds the `POST /sessions` route and a `sessions.onReport` option. Reports are written to the request's wide event and handed to the sink; nothing is stored. The backend's own `/init` emits the same event, so one sink sees hosted and manifest traffic alike.

Reports are handed to the same `onBackgroundRevalidate` hook as a background manifest refresh, so a host that already passes `after` or a platform `waitUntil` needs no change. `resolveConsent` in `@c15t/nextjs/server` gains `waitUntil` for the App Router. Set `reportSessions: false` on any adapter to send none. `createManifestTransport` in `@c15t/core` gains a `report` option; `@c15t/schema` adds `consentSessionReportSchema` and `buildConsentSessionReport`.

### Remove dialog scheduling delays and preserve IAB actions

Remove first-open scheduling delays from React's aggregate dialog, widget, and compound components while preserving server rendering and hydration. Keep children mounted when an external runtime provides IAB context, so loading the bridge cannot reset local drafts.

Remove the extra Suspense delay from Astro's React IAB dialog island.

Queue external-runtime IAB actions until the runtime publishes its handle, and reject pending saves with AbortError when the borrowing provider unmounts. Correct the React and Next.js peer dependency ranges to require React and React DOM 18 or newer, matching the APIs already used by v3. Upgrade both React packages before using v3 on an older installation.

# @c15t/astro

## 3.0.0-alpha.1

### Minor Changes

- dd44a61: Add opt-in `clearOnRevocation` configuration to remove declared cookies, localStorage keys, and sessionStorage keys when their consent category is denied or revoked. Support exact names, prefix patterns, and cookie scopes while protecting c15t consent records.

### Patch Changes

- Updated dependencies [dd44a61]
- Updated dependencies [46f45c4]
  - @c15t/core@3.0.0-alpha.1
  - @c15t/svelte@3.0.0-alpha.1
  - @c15t/ui@3.0.0-alpha.1
  - @c15t/iab@3.0.0-alpha.1

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
  - @c15t/iab@3.0.0-alpha.0
  - @c15t/react@3.0.0-alpha.0
  - @c15t/schema@3.0.0-alpha.0
  - @c15t/svelte@3.0.0-alpha.0
  - @c15t/translations@3.0.0-alpha.0
  - @c15t/ui@3.0.0-alpha.0
  - @c15t/vue@3.0.0-alpha.0

## @c15t/core@3.0.0-alpha.6 (alpha)

### Keep development warnings out of production builds

Development warnings, such as "Vendor … has no declaration", printed in
production browser builds. They now read `process.env.NODE_ENV`, which
bundlers replace at build time. Without a bundler or `process`, the warnings
still show.

### Report who runs the backend as `window.c15t.hosting`

`c15tInstance()` takes a `hosting` option, `'self-hosted'` by default or `'inth'` on Inth's platform. `/init` and `/manifest` report it, and the browser exposes it as `window.c15t.hosting` and the snapshot's `hosting`. It is not signed, so treat it as a debugging signal.

### `ConsentRoot` starts consented scripts sooner

In Next.js and TanStack Start, `ConsentRoot` starts downloading the script
loader during its first render when stored consent already allows one of its
`scripts`, instead of after hydration. There is nothing to configure.

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

### Warn when an experiment's banner asks about no category

When an experiment arm's banner runs under a policy that asks about no optional
category, accepting or rejecting records only a notice acknowledgement.
`onChoiceRecorded` never fires and the experiment counts impressions only. This
happens under a permissive rule when the site declares no categories through
`consentCategories`, `scripts` or `vendors`. c15t logs a warning outside
production the first time it happens.

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

### Add `ExperimentArmName` for typing a flag's arm

`ExperimentArmName<typeof experiment>` is `'control'` plus the arm names of an
experiment built with `defineExperiment()`. Use it to check a feature flag's
value before passing it as `arm`. Import it from `c15t`.

### `ConsentProvider` requests `/init` sooner

In a client render, `ConsentProvider` with `hosted()` and no `prefetch` sends
`/init` during its first render instead of after mount, so the banner shows
sooner (about 38 ms on a throttled mobile profile). Server renders, hydration
and apps with a `prefetch` or `ConsentRoot` keep the previous timing.

### Report a spent request budget as 0 ms

When a consent route's `x-c15t-timeout-ms` budget ran out before the manifest
cache or consent resolution started, the timeout error named a negative
duration, such as "no manifest within -3 ms". It now says 0 ms. Timing is
unchanged: a spent budget already gave up at once.

## @c15t/core@3.0.0-alpha.5 (alpha)

### Runtime for framework providers

`@c15t/core/runtime` adds `createConsentProviderRuntime(options, modules)`, the
runtime a framework provider renders when its options follow its props. On top
of everything `createConsentRuntime` does, it has:

- `update(options)`, which compares a provider's new options with the previous
  ones and applies only what changed: a new user is identified, new overrides
  resolve the policy again, scripts, rules and vendors are declared again, and
  the network and iframe blockers are added, updated or removed.
- `setEnabled(enabled)`, `enabled` and `subscribe(listener)`. Turning
  `enabled` off renders a separate permissive kernel and keeps the visitor's
  records for when it is turned back on.
- A `prefetch` that is still a promise, when `streamPrefetch` is in its
  modules. The first `/init` waits for it and applies the result instead of
  sending a request.
- A choice of module loading: pass `defaultRuntimeModules`, or swap a factory
  for `lazyRuntimeModule(() => import(...))`.

Every runtime also gains `setLanguage(code)` and `experiment`, and
`setConsentCategories(undefined)` drops the configured list.

`createConsentRuntime` now loads the network blocker and data clearing as
separate chunks, and only when they are configured. Matching requests stay
held until the blocker has loaded.

`@c15t/svelte`'s `ConsentManagerProvider` uses the provider runtime. `enabled`,
`scripts`, `vendors`, `networkBlocker`, `iframeBlocker` and `callbacks` now
update after mount. The `user` the provider mounts with is no longer
identified again on mount; it is sent with `/init` and every save, and a later
change is identified.

**Breaking.** In `@c15t/svelte`, `enabled: false` grants every category, so
every gated script loads, as in React. It used to only close the UI.
Migration: set `enabled: false` only where every script may load, such as an
internal preview build. To hide the UI and keep consent gating, leave
`enabled` on and don't render the banner or dialog.

`@c15t/browser`'s `setLanguage()` does nothing for the current language and no
longer requests the policy while the client is disabled or uses
`consentSource`. `presentation` and the UI theme follow an experiment the
server resolved into `prefetch`.

### Ship the script loader only to pages with scripts

Svelte, SvelteKit, Astro and the `@c15t/browser` npm entries now load the script loader as a separate chunk, only when `scripts` is not empty. A page without scripts or network blocker rules ships about 4 KB of gzipped JavaScript less.

Pages that do configure them still get the code without an extra request:

The script loader and the network blocker share one chunk, so a page with scripts and blocker rules fetches one file, and a returning visitor's held requests are decided when their scripts start. A page with only one of them downloads both.

- **SvelteKit:** add `c15tPreload()` from the new `@c15t/svelte/vite` entry to `vite.config.ts`. `c15tHandle` then adds one `<link rel="modulepreload" fetchpriority="low">` for that chunk to every page whose provider has scripts or blocker rules, prerendered pages included. Low priority lets the app's own chunks go first; the runtime needs the chunk only after hydration. The link carries the provider's `nonce`, else the nonce SvelteKit put on its own scripts. Without the plugin, scripts load one request after the app's JavaScript.
- **Astro:** a site that configures `scripts` (or a `clientEntrypoint`, which may add some) keeps the script loader in its boot script; `networkBlocker` rules in the integration options do the same for the blocker. A site with neither never downloads them.
- **`@c15t/browser`:** the script-tag builds (`c15t.js` and friends) are unchanged. With the npm package, the chunk loads when c15t starts; your bundler names it (it starts from `@c15t/core/dist/modules/loader-and-blocker.js`), so add your own `modulepreload` with `fetchpriority="low"` for it if returning visitors' scripts must start sooner.

`@c15t/core/runtime/on-demand` exports `createConsentRuntimeWith(options, modules)`, a configure-once runtime that mounts the module factories you choose, and `mountRuntimeIAB`, next to `onDemandRuntimeModules`. It is separate from `@c15t/core/runtime/provider`, so a provider that loads modules through its own `import()` calls gets no unused chunks from it under esbuild, and a page that configures once gets none of the provider runtime's. The new `@c15t/core/runtime/on-demand-factories` entry (`c15t/runtime/on-demand-factories`) exports each on-demand factory on its own (`scriptLoaderOnDemand`, `networkBlockerOnDemand`, `clearOnRevocationOnDemand`, `connectConsentSourceOnDemand`), for a host that imports some modules statically and loads the rest on demand; the first two each load a chunk with only their module. Astro uses them, so a site with `scripts` keeps the script loader in its boot chunk instead of a chunk of its own.

**Breaking.** `boot()` from `@c15t/astro/client`, called without the integration, no longer mounts a script loader, network blocker or `consentSource` connection itself; the integration's page script registers them. Called on its own with `scripts`, `networkBlocker` or `consentSource` in its options, it throws. Add the `c15t()` integration to `astro.config` for those pages, or leave those options out of a standalone `boot()`.

### Send the consent model as `model` on save

The `/subjects` save body names the consent model `model`, the same name the rest of the v3 API uses. It was `jurisdictionModel`, the last v2 jurisdiction name on the v3 wire.

- `@c15t/core` and the native iOS and Android cores send `model`.
- The backend reads `model` and still accepts `jurisdictionModel` from 2.x clients. When a save carries both, `model` wins.
- `postSubjectInputSchema` adds `model` and marks `jurisdictionModel` deprecated.

The backend only reads this field when a save has no policy decision. Deploy this backend with these clients: an older v3 alpha backend ignores `model`, so its consent records for such saves have no model.

### One preference draft for every framework

React, Vue, Svelte and the `@c15t/browser` preference dialog now share one
draft, `createPreferenceDraft` from `c15t/preference-draft`, so unsaved
choices behave the same everywhere:

- **Stale drafts.** A draft with an unsaved change goes stale when the
  policy, the displayed categories or the vendor list changes. Saving it
  records nothing until the visitor reviews it (`reset()`). A draft with no
  unsaved change follows the policy and is never stale; Vue used to mark it
  stale. The `@c15t/browser` dialog used to drop unsaved changes silently;
  it now shows a review notice.
- **Choices saved elsewhere.** When another surface or tab records a choice,
  switches the visitor left alone take the new value and moved ones keep
  theirs. React used to write the old values back on save.
- **Category order.** Every preference form, and `runtime.consentCategories`,
  lists categories in one fixed order: necessary, functionality,
  measurement, experience, marketing. Vue and `@c15t/browser` used the
  configured `consentCategories` order.
- **Draft values.** `values` lists every category; ones the policy does not
  offer read `false`. Vue and Svelte listed only the displayed ones.
- **Late defaults.** Presentation defaults from an experiment arm assigned
  after the dialog opened apply only while the visitor has changed nothing.
- **IAB dialog in Vue.** Each switch writes the CMP selection at once, as in
  React and Svelte. Closing the dialog keeps those changes, and saving can
  no longer overwrite a newer receipt with an older copy.

React's banner buttons no longer load the draft: it ships with the
preference dialog, which takes about 1.4 KB gzip off the first load of a
page that renders a banner. The `@c15t/browser` ES module build loads its
preference dialog and the draft as a separate chunk, in idle time once the
banner or trigger shows; the script-tag files stay one file each.

In Svelte the draft now ships with `ConsentWidget` and `ConsentDialog`
instead of `ConsentManagerProvider`. The state API keeps its synchronous
shape. `setSelectedConsent()` calls made before the draft loads apply in order
when it lands, and `saveConsents('custom')` waits for it.

**Breaking:** in headless Svelte code that renders neither component,
`selectedConsents` and `draft` read empty on first use, because the draft
loads then, and fill in reactively once it lands. A one-off read outside a
reactive context gets the empty values. Migration: read them in a reactive
context (`$derived`, `$effect` or markup).

**Breaking:** the runtime's `stageVendorConsent()` and `resetVendorDraft()`
are removed. Pass vendors to the save
(`kernel.commands.save({}, { vendors: { 'x-pixel': false } })`) or stage
them on a preference draft. Vue's `useConsentDraft()` returns
`displayedCategories` and `vendors` as computed refs, takes no argument, and
no longer has `reseedOnNextRecord()`; call `reset()` after a bulk save
instead.

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

### Load persistence's write code on demand

Persistence still reads stored records synchronously at startup, but the
code that writes and reconciles them now loads as its own chunk: in idle
time after the page's `load` event once a banner or dialog has been shown,
or at the first save or reconciliation. Every entry that persists consent
loads about 2.4 KB gzip less JavaScript up front.

Until that chunk has loaded, a save waits for its record to be stored
before its request leaves and before it resolves, and `reconcile()` returns
`false` and runs when it lands. If the chunk fails to load, the save keeps
waiting and the chunk is tried again, so a revocation reload never runs
while storage still holds the revoked choice. `clear()` needs no chunk: it
removes stored records and stores the clear epoch before it returns. Stored records and cookies keep
their format. Leaving the page (`pagehide`) now writes any record still
waiting to be written.

### One manifest cache for every server adapter

Next.js, Nuxt, SvelteKit, Astro and TanStack Start now read the backend manifest through one function, `fetchCachedManifest` from `@c15t/core/server`, and share one in-process cache of up to 128 entries. Before, SvelteKit and Astro kept a separate 64-entry cache and Next.js a third one, and each took different options.

The cache key is now the same for every caller. Query parameters are sorted by name and the URL fragment is dropped, so `?b=2&a=1` and `?a=1&b=2` read one entry and reach the backend as one request. That request keeps the first caller's URL and query as written, so a signed `manifestURL` still verifies. Request headers that equal the ones the cache sends anyway (`accept: application/json` and the c15t protocol headers) no longer split the cache. The `init` option passes a framework fetch hint such as Next.js `{ next: { revalidate } }` and is not part of the key.

**Breaking.**

- `@c15t/core/libs/manifest-cache` and `c15t/libs/manifest-cache` are removed. Import `fetchCachedManifest` and `clearManifestCache` from `@c15t/core/server` (`c15t/server`) and pass `sourceURL` instead of `url`. The `CachedManifest` type is now `CachedManifestResponse`.
- `fetchCachedManifest` from `@c15t/core/server` and `@c15t/astro/api` takes `sourceURL` instead of `config` (build it with `resolveManifestSourceURL({ backendURL, manifestURL })` from `@c15t/core/server`), and reads the shared cache. The `ManifestSourceConfig` type is removed; use `ManifestSourceOptions`.
- `@c15t/vue/runtime/server/manifest-mode` and `c15t/vue/runtime/server/manifest-mode` are removed. Import the manifest cache and its helpers from `@c15t/core/server` instead, and `resolveManifestInit` and `getResolverInputsFromHeaders` from `@c15t/core/transports/manifest-cache`; `clearManifestRouteCache()` is `clearManifestCache()`.

### Load runtime modules on demand as single chunks

`onDemandRuntimeModules` from the new `c15t/runtime/on-demand` entry
(`@c15t/core/runtime/on-demand`) loads the script
loader, the network blocker, data clearing and a `consentSource` connection
only when a page configures them. The script loader and the network blocker
load as one chunk, and the others as one each. No chunk imports anything the
first chunk has, so Vite and esbuild no longer split shared
consent code into extra files that every page then fetches up front. Spread
it into the modules you pass to `createConsentProviderRuntime`. The Vue
plugin and Nuxt module use it.

If the network blocker's chunk fails to load, requests its rules match are
answered as blocked (a `451` response or a failed XHR) instead of waiting for
the life of the page, and the chunk is tried again when the browser comes
back online.

### A smaller public interface for `@c15t/core`

`@c15t/core` (and `c15t`) stops exporting kernel verbs only its own modules
call, building blocks no adapter uses, and a second home for the manifest
cache.

**Kernel (`ConsentKernel`)**

| Removed | Use instead |
| --- | --- |
| `kernel.hydrate(records)` | Pass `initialRecords` to `createConsentKernel()`, or mount `createPersistence()` from `c15t/modules/persistence`. |
| `kernel.markLive()`, `kernel.holdSaves()`, `kernel.events.emit()` | Nothing; the runtime and persistence call them. |
| `kernel.set.vendorDraft(values)` | `kernel.commands.save(input, { vendors })`, or a preference draft's `setVendor()`. |

`kernel.getRecordsGeneration()` stays and is now documented.

**Runtime**

| Removed or renamed | Use instead |
| --- | --- |
| `runtime.onIABChange(listener)` | `runtime.subscribe(listener)`, and read `runtime.iab` inside the listener. |
| `createRuntimeKernel`, `hasResolvedPrefetch`, `normalizeKernelUser`, `resolveRuntimeTranslations`, `stringifyRuntimeError`, `ALL_CONSENTS_GRANTED` from `c15t/runtime` | Nothing; `createConsentRuntime` and `createConsentProviderRuntime` cover them. |
| `createPersistence(options, loader)`, `preloadPersistenceWriter()` | `createPersistence(options)`. |

`runtime.setOverrides()` merges into the current overrides, as it always
did; the docs used to say it replaces them.

**Server**

The manifest cache (`fetchCachedManifest`, `createManifestCache`,
`clearManifestCache`, `ManifestUnavailableError` and the manifest header
helpers) is exported from `@c15t/core/server` (`c15t/server`) only.
`@c15t/core/transports/manifest-cache` keeps `resolveManifestInit`,
`getResolverInputsFromHeaders`, `withResolutionBudget` and
`DEFAULT_RESOLVE_TIMEOUT_MS`.

These are no longer exported from `c15t/server`: the consent-proxy helpers
(`forwardConsentRequest`, `buildConsentProxyRequestHeaders`,
`buildConsentProxyResponseHeaders`, `filterCookieHeader`,
`rewriteProxySetCookie`, `stripIdentityForCleartext`, `isCleartextRemoteURL`,
`isConsentProxyPathAllowed`, `resolveConsentProxyOptions` and the
`CONSENT_PROXY_*` constants), the session-report helpers
(`reportConsentSession`, `buildConsentSessionReport`,
`forwardSessionReportHeaders`, `isSpeculativeRequest`,
`resolveSessionReportBackendURL`, `SESSION_REPORT_*`), `resolveConsentInit`,
`GVL_FETCH_TIMEOUT_MS` and `getManifestAge`. Use
`createConsentRouteHandler()`, which runs all of them.

**Root index**

No longer exported from `@c15t/core` / `c15t`: `setCookie`, `getCookie`,
`deleteCookie`, `deleteConsentFromStorage`, `CONTROL_ARM`,
`experimentArmRef`, `startExperiment`, `resolveExperimentPresentation`,
`disabledPolicyResolution`, `extractConsentNamesFromCondition`,
`hasRevokedPermission`, `initResponseToKernelConfig`,
`kernelConfigToInitResponse`, `mergeInitResponseIntoKernelConfig`,
`resolveVendors`, `vendorRenders`, `resolveWindowDebugMode`,
`createGvlReferenceURL`, `deferInitGvlToRoute`, `serveGvlReference`,
`validateExplicitChoice` and `validateNoticeDismissal`. Consent storage
belongs to the persistence module; `getRootDomain` stays for
`storageConfig`.

**Smaller pages**

The inline script that starts `/init` before the app loads (Nuxt `ssr: false`
pages, Next.js, TanStack Start, Astro) is 712 B gzip instead of 1,054 B.

**`@c15t/vue`**

**Breaking.** `@c15t/vue/runtime/utils/save-iab-choice` and
`c15t/vue/runtime/utils/save-iab-choice` are removed. Their
`saveIABChoice(kernel, save)` only called `saveIABConsentSurface(kernel, save)`
from `@c15t/core/surface-actions` (`c15t/surface-actions`); import that
instead.

**`@c15t/browser`**

`client.consentCategories` lists the policy's categories in the dialog's
fixed order: `necessary`, `functionality`, `measurement`, `experience`,
`marketing`. It used to put the configured `consentCategories` order first.

### Vue and Nuxt on the shared runtime

The `c15tVue` plugin and the Nuxt module now build their consent runtime with
`createConsentProviderRuntime` from `@c15t/core`, the runtime React and Svelte
use, instead of their own copy. Plugin options, module options, composables
and components keep their names and shapes.

New: the `iab` option sets IAB TCF publisher settings for the CMP Vue mounts
under an `iab` policy, such as `publisherRestrictions` and
`publisherCountryCode`. Vue apps had no way to set restrictions before, and
mounting the CMP reset them to none. Fields left out still come from `/init`,
and `iab: false` mounts no CMP.

Behaviour that changes:

- On a Nuxt page with `ssr: false`, the plugin starts the runtime before the
  app mounts, so `/init` runs while the app mounts instead of after it.
- Clearing records before the runtime starts, or without browser storage, now
  also clears the vendor choice.
- Experiment arms are checked against your `theme`, so an arm that is only
  balanced together with your theme's `consentActions` is no longer rejected.
- A `Sec-GPC` signal from the request stays active when the browser reports
  `navigator.globalPrivacyControl === false`, as in every other adapter.
  Vue used to switch it off.
- The script loader, network blocker, data clearing and a `consentSource`
  connection load as separate chunks, only for apps that configure them.
  Consented scripts mount once the script loader has loaded, matching
  requests stay held until the network blocker has, and optional categories
  stay denied until a `consentSource` connects.
- The Nuxt module stops Nuxt adding `rel="prefetch"` hints for c15t chunks
  a page loads only when it configures them or after its first banner (the
  modules above, live option updates, the save path and the preference
  dialog, which c15t warms after the page's `load` event). The IAB banner,
  the experiment controller and the client manifest resolver keep their
  hints.
- Changes to the Nuxt `c15t` app config while the page runs, such as
  `updateAppConfig()`, now reach the runtime: scripts, network and iframe
  blocking, vendors, categories, callbacks and `reloadOnConsentRevoked` follow
  them.
- A plain Vue `prefetch` without a resolved policy no longer skips `/init`.

The object `useConsentKernelContext()` returns gains `runtime`, `start()`,
`setOverrides()` and `update()`.

**Breaking.** That object no longer has `initialRecords`
(`useConsentKernelContext` from `@c15t/vue/composables/kernel` and
`c15t/vue/composables/kernel`). Read the records from the snapshot instead:
`useConsentSnapshot().value` has `explicitChoice`, `subject`,
`noticeDismissal` and `vendorChoice` once storage or the prefetch has
hydrated the kernel.

`@c15t/core`: a runtime `prefetch` whose `initialRecords` names only a
subject, as an `/init` answer's `subjectId` does, no longer counts as records
the server read. Storage hydrates the kernel as it would without a prefetch,
so a stored choice applies, and the named subject stays unless storage holds
its own.

### Clearing records drops queued saves

`clearRecords()` now drops every consent save still queued for replay, whether
or not browser persistence is mounted. Before, a runtime without persistence
replayed the previous visitor's queued choices after the clear.

A save that fails while records are being cleared is no longer queued after
the clear. Where localStorage is unavailable, failed saves are kept in memory
and retried after the next initialization or when the browser comes back
online, instead of being dropped. Saves queued by earlier releases still
replay.

### Remove the v2 `jurisdiction` label and `disableGeoLocation`

v3 decides consent from policy rules, so the regulation label v2 derived from a fixed country table (`GDPR`, `CCPA`, `NONE` and so on) is gone from the API.

- `/init` responses and session reports no longer carry `jurisdiction`, so `sessions.onReport` no longer receives it. Read the matched policy from `policyResolution`, or the report's `policy`, `country` and `region`.
- `@c15t/schema` removes `jurisdictionCodes`, `jurisdictionCodeSchema`, `JurisdictionCode` and `checkJurisdiction`. `@c15t/core` and `c15t` remove the unused `LocationInfo`, `ConsentBannerResponse` and `JurisdictionCode` types.
- The `disableGeoLocation` manifest option is removed. To show every visitor the same banner, configure one policy rule with `match: { isDefault: true }`; the browser resolves it without a location. To test a region's rule, set the country in the client's `overrides`, for example `overrides: { country: 'US' }`.
- The `/init` translations schema is now one shape with optional keys. `completeTranslationsSchema`, `partialTranslationsSchema` and the `partial*` section schemas are removed, along with the deprecated `frame` key, which the backend already folds into `consentGate`. `titleDescriptionSchema` now accepts a pair with `title` or `description` missing, so its inferred type has both fields optional.
- The backend still accepts `jurisdiction` in a save request from a 2.x client and ignores it. Policy snapshot tokens no longer carry the claim, and tokens that still do are accepted.
- Migration 7 makes `runtimePolicyDecision.jurisdiction` nullable; new decisions store `null` and 2.x rows keep their value. Apply it with `@c15t/cli self-host migrate --apply` before deploying this backend.

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

### Start `/init` from the HTML of Nuxt `ssr: false` pages

On a page Nuxt sends as a shell (`ssr: false` for the app or the route), the
module now writes a small inline script into the page head that calls the
backend's `/init` while the browser is still parsing the HTML. When the app's
JavaScript has loaded, the consent runtime uses that response instead of
sending its own request. Before, the request waited for the app's JavaScript
to download and run.

The script is added only when `manifest` is unset and no `consentSource`,
`customFetch` or `experiment` is configured. It carries the backend URL and
nothing from the request, so prerendered and cached shells can include it.
Server-rendered pages are unchanged.

The script takes `nuxt-security`'s per-request nonce, or the `nonce` option.
Set the new module option `initPrefetch: false` to turn it off, for example
when your Content Security Policy cannot allow it, or the route rule
`c15t: { initPrefetch: false }` to turn it off for some routes.

`buildPrefetchScript` from `@c15t/core` now works in server bundles built by
Nitro. Nitro rewrote `typeof window` inside the script's text, so the script
returned before it sent any request.

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

## @c15t/core@3.0.0-alpha.4 (alpha)

### Resolve a relative backendURL against the request, not forwarding headers

A relative `backendURL` or `manifestURL` no longer resolves against client-controlled forwarding headers. The server helpers previously built the backend origin from `x-forwarded-host`, `x-forwarded-proto` or `referer` when present, so a request that set them could make the server send its `/init` or manifest request, with the request's cookies and forwarded headers, to another host.

A relative URL now resolves against the URL the framework resolved the request under (`event.url` in SvelteKit, `request.url` in Next.js route handlers, TanStack Start and Astro), or against the `host` header where no request URL exists (Next.js `resolveConsent`, `fetchSSRData`). A bare `host` resolves over `https` for a domain name and over `http` for `localhost`, an IP address, or a single-label host such as `app:3000`. The `referer` header is no longer used.

Apps behind a proxy that sets forwarding headers and drops incoming ones can opt back in with `trustForwardedHeaders: true` on SvelteKit `loadConsent` and `resolveConsent`, Next.js `resolveConsent`, `createNextConsentRouteHandlers` and `createPagesApiHandlers`, and `@c15t/react/server` `fetchSSRData` and `normalizeBackendURL`, matching the existing TanStack Start option. The rule lives in `resolveRequestBackendURL` and `resolveRequestOrigin`, new exports of `@c15t/core/server`, which every server adapter now shares. With the option set, the forwarded host and the forwarded scheme apply independently, so a proxy that keeps `host` and only sets `x-forwarded-proto` or `x-forwarded-ssl` still decides the scheme.

The SvelteKit and `@c15t/react/server` helpers also stop passing the client's `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers to the backend, including when `forwardHeaders` names them in SvelteKit. `extractRelevantHeaders` in both packages leaves them out unless called with `{ trustForwardedHeaders: true }`. `fetchSSRData` still makes its `/init` request when those headers are the only ones besides `host`; it just does not forward them.

`resolveBackendURL` from `@c15t/schema/types` is deprecated in favor of `resolveRequestBackendURL`. It now follows the same rule by default: it reads only the `host` header, and ignores `x-forwarded-*` and `referer` unless its new third argument is `{ trustForwardedHeaders: true }`, which restores the previous resolution order. The forwarded values are now validated like `host`: the first entry of a comma-separated list is used, a scheme other than `http` or `https` is ignored, and a host that is not a bare authority resolves to `null`.

### Show only necessary when a site declares no categories

A site that declares no categories, through `consentCategories`, scripts, network rules, vendors or discovered frames, now offers only Strictly necessary under a permissive policy, as in v2. The banner still appears when the policy asks for a choice. Accept all, Reject all and Save each record an acknowledgement that keeps the banner dismissed after reload, and hosted and manifest modes send a consent receipt for necessary alone. The acknowledgement expires with the policy's choice validity or a policy change, and a category declared later asks again. Strict policies and IAB TCF policies still offer their whole scope.

The Astro server now judges a visitor against the categories the page's `consentCategories`, `scripts` and network rules declare, so it renders the same banner decision as the browser. Browser `hasConsented()` and the `after-consent` trigger treat the acknowledgement as a decision.

In React Native, the Swift and Kotlin cores apply the same rule when the app sets no `consentCategories`: a permissive policy offers only Necessary, any save records the acknowledgement and sends the necessary-only receipt, and strict policies still offer their whole scope. A declared list now also narrows what Accept all and Reject all confirm, as on the web.

### Forward consent saves through the SvelteKit consent route

`createSvelteKitConsentRouteHandlers` answered `GET` only, so a provider
using `hosted({ url: '/api/c15t' })` got `405` on every save. Pass
`proxy: true` and the handlers add `POST`, `PATCH`, `PUT`, `DELETE` and
`OPTIONS`, which forward to `backendURL`. `GET` forwards paths other than
`init` and `manifest`, which are still resolved in-process. Only those
exact rest paths stay local, so a `paths` entry such as `reports/manifest`
is forwarded. Export all six from the catch-all route:

```ts
// src/routes/api/c15t/[...path]/+server.ts
export const { GET, POST, PATCH, PUT, DELETE, OPTIONS } =
	createSvelteKitConsentRouteHandlers({ backendURL, proxy: true });
```

The option and its rules match `createConsentServerRoute({ proxy })` in
`@c15t/tanstack-start`: only `subjects`, `subjects/:id`, `init`,
`manifest`, `health`, `status` and any `paths` you add are forwarded, and
anything else gets `404`. Cookies are forwarded only when `cookieNames`
names them. The client address comes from `event.getClientAddress()`, and
`x-forwarded-host` and `x-forwarded-proto` from `event.url`.

A relative `backendURL` or `manifestURL`, such as `/api/self-host`, is now
fetched through `event.fetch`, so SvelteKit answers it in-process. The
route handlers used to resolve it against `event.url`, which on
adapter-node without `ORIGIN` takes its host from the client's `Host`
header, so a forged header could send the manifest, init or proxied
request to a host of the client's choosing and return its response. The
`fetch` option now applies to absolute URLs only.

To a remote backend over plain `http:`, the proxy sends only the public
browser headers: no cookies, no custom headers and no `x-forwarded-for`.
Such a backend no longer sees the visitor's IP address, so it cannot use it
for geolocation or rate limiting; use an `https:` backend URL to keep it.
Loopback `http:` backends still receive all three.

The proxy rules now live in `@c15t/core/server` as `forwardConsentRequest`,
`resolveConsentProxyOptions`, `isConsentProxyPathAllowed` and related
helpers, and both adapters use them. Each adapter supplies only what its
framework can trust for the forwarding headers. Both proxies now answer
`504` with a JSON body when the backend misses the deadline and `502` when
it cannot be reached, instead of a framework error page. They also stop
passing `TE`, `Trailer` and any header the backend's `Connection` value
names on to the browser. TanStack Start's proxy otherwise behaves as
before.

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

### Keep blocking iframes past an unreadable iframe or an empty category

The iframe blocker now skips an iframe the page can't read, not only an unreadable node that contains it. Before, one such iframe made `createIframeBlocker` throw on startup and stopped each later pass early, so other consent-gated iframes loaded. The on-demand watcher in `@c15t/react` had the same gap.

An empty `data-category` is now treated like an unknown category: the iframe stays blocked and logs a console warning. Before, it counted as no category, so the iframe loaded without consent.

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

### One tenant setting, refused when it is unsafe, and recovery for visitors whose subject ID another tenant holds

A self-hosted backend now names its tenant in one place: the instance's `tenantId`. `manifest.tenantId` is removed from the backend configuration. It never scoped a database query, but it did scope policy snapshot tokens when the instance had no `tenantId`, so a config that set only that one issued tokens for a tenant while writing every consent with a null tenant. Built manifests no longer carry it. `ConsentManifest.tenantId` stays on the wire type for other manifest producers.

`c15tInstance` and `createApp` check the tenant when the instance is built. They throw when `tenantId` is empty, padded with whitespace or not a string (a `null` from a JavaScript config used to scope every query to `tenantId = NULL`, which matches nothing), and when the config still sets `manifest.tenantId`, rather than ignoring it. The new `requireTenantId: true` option makes a missing `tenantId` throw too. Set it on every instance that shares a database with other tenants. Without it, an instance whose tenant lookup returned `undefined` starts in the single-tenant scope and writes consents with a null tenant, which the tenant that owns them never reads.

Subject IDs are chosen by the browser and are unique across the whole database. A save naming a subject ID that another tenant holds was answered `400 CONFLICT`, on every save, with no way for the visitor to recover. It is now `409 SUBJECT_CONFLICT`. `@c15t/core` responds by giving the visitor a new subject ID, moving any queued saves to it, and sending the choice once more. Every open tab moves to the same new ID. A consent recorded again with different receipts, purposes or vendor grants is now `409 CONFLICT` instead of `400`. The hosted and manifest transports treat both as permanent refusals, so the kernel no longer replays them from its queue.

### Migration

- Remove `tenantId` from the backend's `manifest` block and set it on the instance. If the instance already sets the same value, delete the manifest one. If it set only `manifest.tenantId`, the instance has been writing rows with a null tenant: setting `tenantId` scopes it to that tenant, and those rows stop appearing in its reads.
- Code that matched `400` with `cause.code: 'CONFLICT'` from `POST /subjects` should expect `409`, and `SUBJECT_CONFLICT` for a subject ID held by another tenant. `PUT /legal-documents` conflicts are still `400 CONFLICT`.
- A manifest built from a config that set `tenantId` gets a new `revision`, so cached manifests refresh once.

### Check iframes on demand with `processIframes()`

`iframeBlocker: { disableAutomaticBlocking: true }` is now usable outside React. The consent runtime from `@c15t/core/runtime` has a `processIframes()` method, and `@c15t/browser` exposes it as `client.processIframes()` and `c15t.processIframes()`. Each call pauses gated frames (`data-category` or `data-vendor`) that consent does not allow and restores the ones it does. With automatic blocking on, the blocker still does this by itself. `c15t.push(['processIframes'])` runs once the policy has resolved.

### Gate iframes after a client router replaces the page body

The iframe blocker now watches the document root instead of the `<body>` it saw at startup. Astro's `ClientRouter` and Turbo replace `<body>` on navigation, so gated iframes on a page reached by client-side navigation used to keep their `data-src` after consent was granted, and kept loading their `src` after it was denied, until the next consent change. The blocker also now starts watching when it runs from a script in `<head>`, before `<body>` exists.

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

### An undeclared vendor reads as not allowed

Breaking change: reading vendor consent for an id that no `vendors` entry, script slug or backend vendor list declares now returns `false`. Before, React's `useVendorAllowed`, Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` returned `true` for such an id without checking any category, so a typo or a missing declaration read as allowed before the visitor consented. In development, c15t logs one warning per undeclared id that names the missing declaration. Declare every vendor you read, for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The rule lives in one helper, `isVendorAllowed(snapshot, vendorId, now?)`, exported from `c15t` and `@c15t/core`. A declared vendor keeps its behaviour: it is allowed when its category condition passes and, outside an IAB policy, the visitor has not switched it off.

Vue gains `useVendorAllowed(vendorId)`, which returns a computed boolean and is auto-imported in Nuxt. The Svelte consent manager from `getConsentManager()` gains `isVendorAllowed(vendorId)`.

Scripts, iframes and network rules that carry an undeclared `vendor` slug are gated as before: they follow their category.

## @c15t/core@3.0.0-alpha.3 (alpha)

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

### Record consent saves replayed after the policy token expired

A save that fails in the browser is queued and replayed on the next page load or when the browser comes back online, for up to 7 days, with the original click time and policy snapshot token. The self-hosted backend's tokens expire after 30 minutes, so a replay after that was refused with `409 POLICY_SNAPSHOT_INVALID` and the choice stayed in the browser only. The queue then retried it until its 10 attempts ran out.

The backend now records a late save when the token was valid at the save's `givenAt`: the signature, issuer and tenant audience verify, `givenAt` is within the token's lifetime (with 10 minutes of slack for the visitor's clock), the request arrives within `policySnapshot.replayWindowSeconds` of expiry (default 7 days; `0` turns it off), and the manifest still has the policy the token names under the same fingerprint. The record keeps `givenAt` as sent and gets `runtimePolicySource: 'snapshot_token_replayed'`. Saves that arrive while their token is valid are unchanged.

Refusals are now specific. A choice made after the token expired, or a replay after the window, is `409 POLICY_SNAPSHOT_EXPIRED`. A token naming a policy that has since changed is `422 STALE_POLICY` with reason `policy-changed`, live or late, so a choice is never recorded against a policy the visitor didn't see. A token that doesn't verify is still `409 POLICY_SNAPSHOT_INVALID`.

`@c15t/core`'s hosted and manifest transports throw a `ConsentSaveRejectedError` for these refusals, and the kernel drops the save instead of queueing or retrying it. The choice stays recorded in the browser. Queued older saves for the same categories are dropped too, so a grant queued while offline can't replay after the visitor's newer choice was refused. `save:replayed` events carry the backend's code in `rejected`. A custom transport can throw `ConsentSaveRejectedError` to get the same behaviour; `isConsentSaveRejection()` checks for one. Both are exported from `@c15t/core` and `@c15t/core/transports`.

### Migration

- Code that reads consent records and switches on `runtimePolicySource` should handle `snapshot_token_replayed`.
- Code that matched `409 POLICY_SNAPSHOT_INVALID` from `POST /subjects` should also expect `409 POLICY_SNAPSHOT_EXPIRED` and `422 STALE_POLICY` with reason `policy-changed`.
- To keep refusing every save that arrives after its token expired, set `policySnapshot.replayWindowSeconds: 0`.

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and reload the page when the source withdraws a granted category, using the existing `reloadOnConsentRevoked` option and `onBeforeConsentRevocationReload` callback. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

Keep disabled runtimes permissive when an external source is configured. Complete browser readiness after connecting the source, keep Astro preference triggers available, and reject IAB saves owned by an external CMP. External permissions disable c15t IAB authority. Deliver events for built-in Umami, Rybbit and Matomo integrations, and preserve custom GTM queue names during initialization and dispatch.

Report external CMP subscription failures without aborting provider startup. Keep optional permissions denied and ignore notifications from the failed connection.

### Keep blocking iframes when one node on the page is bad

The iframe blocker could let consent-gated iframes load after it hit a node the page can't read, such as one Firefox reports as "Permission denied to access property". It skipped every iframe in that `MutationObserver` batch, including ones added before the bad node. The on-demand watcher in `@c15t/react` had the same gap. Both now skip the unreadable node and gate the rest.

An iframe with an invalid `data-category` no longer throws. Before, one such iframe stopped the blocker from starting and made every later pass stop early, so revoking consent left other gated iframes loaded. It now stays blocked and logs a console warning, the same way the on-demand watcher already held it.

### `useNetworkBlocker` holds matching requests from its first render

The standalone `useNetworkBlocker` hook installed the blocker from a mount effect. Effects in the calling component's children, and in components rendered before it, run first, so matching `fetch` and XHR requests sent from them went out without a consent check on first visits and for visitors who had rejected. The hook now holds matching requests from the first render of the component that calls it, the same way the provider's `networkBlocker` option does since the previous release, and the blocker decides them once it loads.

Holds are now tracked per caller. When a page uses both the provider option and the hook, one blocker loading or one component unmounting no longer releases requests that the other's rules still hold. A blocker configured with `enabled: false` holds nothing and no longer sends requests another caller holds. `createConsentRuntime()` (which the Svelte, Astro and browser packages use) and the Vue plugin follow the same rules, and a runtime or Vue context disposed before it starts ends only its own hold. The requests it held are answered as blocked (a 451 response for `fetch`, a failed XHR) rather than sent, since nothing checked consent for them.

### Migration

The hook's first render in the browser now has a side effect: it patches `fetch` and `XMLHttpRequest` to hold requests that match its rules. On the server it still does nothing. If React discards that render and never commits it (a render that throws, or an attempt thrown away while suspending), the hold ends after 10 seconds and the requests it held fail as blocked (a 451 response for `fetch`, a failed XHR), since nothing checked consent for them. The same applies when the hook's component, or the provider, unmounts before its blocker loads. No code changes are needed. If a test asserts that `window.fetch` is untouched after rendering a component that calls the hook, update it: during the first render `window.fetch` is the hold's wrapper, and after the blocker loads it is the blocker's.

### Reload the page when a visitor revokes consent

Revoking consent removed a vendor's script element but left its code running. Listeners, timers, history hooks and chat widgets kept working until the next full page load. v2 reloaded the page on revocation, and v3 lost that behaviour when the consent policy contracts were unified.

When an accept, reject or save turns off a category or vendor that was granted, the page now reloads after every in-flight save request settles, so the next page runs only permitted code. `onBeforeConsentRevocationReload` runs just before the reload. A first visit that rejects under opt-in does not reload, because nothing gated had run. Rejecting defaults under opt-out does, because gated code ran before the choice. Expiry, policy changes and privacy signals do not reload.

Set `reloadOnConsentRevoked: false` to turn this off. The option is available on `ConsentProvider`, `ConsentRoot` `options`, `createConsentRuntime()`, the Vue plugin config, the browser client, and the Astro integration. `@c15t/svelte` receives it through its runtime options.

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

### Keep consent changes flowing when a listener throws or updates consent

A snapshot subscriber or event listener that throws no longer stops the
listeners after it, and no longer rejects the `commands.save()` that caused the
change. Before, a throwing subscriber kept later subscribers and persistence
from seeing a denial and suppressed `choice:recorded`, even though the
permission had already changed in memory. c15t now passes the error to
`reportError` in a browser page and logs it with `console.error` elsewhere, so a
throwing listener can't end a Bun or Deno server process.

Listeners also receive the snapshot the change produced, and every listener sees
changes in commit order. Before, a subscriber that granted consent again while
being told about a denial made later subscribers see the new grant twice and
miss the denial. Now each of them sees the denial and then the grant. The
`choice:recorded` event of the outer save also carries its own snapshot.
Listeners that keep changing consent in response to each other are stopped
after 100 nested notifications, and the error is reported. Notifications already
queued still arrive, so other listeners end on the current snapshot.

### Keep policy pack resolution out of client bundles

The React provider and the core runtime resolved their disabled-mode policy with `resolvePolicyRules` when they loaded, so every page validated a rule and computed three SHA-256 fingerprints on startup, and every client bundle carried the policy validator and the hashing code. The kernel's policy wire reader also shared a module with `resolvePolicyRules`, which pulled in the same code. The disabled resolution is now a constant, pinned by a test to what the resolver returns, and `@c15t/schema/types` exports the wire reader and resolved-rule checks from their own modules. In a Next.js 16 production build of the App Router setup, first-load JavaScript drops by 17,665 bytes (5,313 bytes gzip). Every public export keeps its name and behavior.

### Block network requests sent before the network blocker loads

The network blocker loaded after mount, so a `fetch` or XHR that matched a rule and was sent from a child component's mount effect, from an effect next to the provider, or from a client module evaluated inside it went out without a consent check. This happened on first visits, for visitors who had rejected, and when the policy request failed or hung. `ConsentProvider` and `ConsentRoot` now hold matching requests from their first render in the browser, and the blocker decides them once it loads. Vue holds them from plugin install until the root mounts. `createConsentRuntime()`, which `@c15t/svelte` and the `c15t` browser client use, holds them from construction until `start()`. A provider that unmounts before its blocker loads, a runtime disposed before `start()`, or a Vue context disposed before its root mounts answers the requests it held as blocked (a 451 response for `fetch`, a failed XHR) rather than sending them, since nothing checked consent for them. Requests another caller still holds keep waiting.

While consent is unknown, a matching request that would be blocked now waits instead of failing. It is sent if the resolved policy and the visitor's stored choice allow it, and blocked if they do not or if the policy fails to load. Requests that match no rule are not delayed. Apps without `networkBlocker` still do not download the blocker; the hold adds about 0.8 KB gzip to first-load JavaScript.

Requests made before the provider renders are still out of reach, including inline scripts, tags loaded before hydration, and client modules that webpack evaluates when a route's chunk loads. The new network blocker pages for Next.js and React describe these limits and how to keep tracking calls out of that window.

## @c15t/core@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Session reports from manifest mode

A host that resolves init from a cached manifest never calls `/init`, so the backend could not count the visitors it served. Every server-side resolution now sends `POST /sessions` to the backend after the fact, server-to-server and detached from the response: the Next.js, TanStack Start, SvelteKit, Nuxt and Astro init routes, and the Next.js, TanStack Start and Astro render-time prefetches. The report carries the manifest revision, the matched policy, the jurisdiction, country, region, language and GPC signal. The visitor's user agent travels as `User-Agent` and the visitor's single client address on a dedicated `X-C15T-Client-IP` header, which the backend masks and records under its `ipAddress` settings; the forwarding chain itself is not sent, and neither are cookies. The browser makes no request.

`@c15t/backend` adds the `POST /sessions` route and a `sessions.onReport` option. Reports are written to the request's wide event and handed to the sink; nothing is stored. The backend's own `/init` emits the same event, so one sink sees hosted and manifest traffic alike.

Reports are handed to the same `onBackgroundRevalidate` hook as a background manifest refresh, so a host that already passes `after` or a platform `waitUntil` needs no change. `resolveConsent` in `@c15t/nextjs/server` gains `waitUntil` for the App Router. Set `reportSessions: false` on any adapter to send none. `createManifestTransport` in `@c15t/core` gains a `report` option; `@c15t/schema` adds `consentSessionReportSchema` and `buildConsentSessionReport`.

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the `vendors` option or the backend manifest, then name them with `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and its vendor is not off; `alwaysLoad` scripts see the result in their callbacks.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte list each category's vendors with a switch per vendor. Switches edit the draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. React adds `useVendorDraft`, `useVendorAllowed`, `useDeclaredVendors` and `useVendorChoice`; `useConsentDraft` gains `vendors` and `setVendor`; the Svelte manager state gains `selectedVendors` and `setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and reach the backend as `vendorChoice`. Migration `4-vendor-choice` adds the column, so run the migrator before deploying. A denial has no expiry and does not delete cookies the vendor already set.

Also fixed: the Vue preference center rendered its switches and category rows unstyled in Nuxt, and the Vue and Svelte category description colour differed from React's.

### Restore category discovery and consent completion

Restore category discovery from scripts, frames, and network rules. Merge discovered categories with `consentCategories` within the policy scope, and use the same set for the dialog and consent completion. Keep the banner dismissed after accepting the displayed categories and reloading. Enable tagged iframe discovery and blocking by default in React, matching the shared runtime.

# c15t

## 3.0.0-alpha.1

### Minor Changes

- dd44a61: Add opt-in `clearOnRevocation` configuration to remove declared cookies, localStorage keys, and sessionStorage keys when their consent category is denied or revoked. Support exact names, prefix patterns, and cookie scopes while protecting c15t consent records.

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
  - @c15t/schema@3.0.0-alpha.0
  - @c15t/translations@3.0.0-alpha.0

## 2.2.0-canary-20260731105620

### Patch Changes

- c187c9d: Add a `nonce` option for nonce-based Content Security Policies

  The injected `<style id="c15t-theme">` element previously carried no nonce, so a strict CSP blocked it unless you allowed `'unsafe-inline'`. Setting `nonce` on the provider options now applies it to that stylesheet and to every `<script>` element created by the script loader. A per-script `nonce` still takes precedence.

  ```tsx
  <ConsentManagerProvider options={{ mode: "offline", nonce }}>
    {children}
  </ConsentManagerProvider>
  ```

## 2.2.0-canary-20260727202135

### Patch Changes

- 16a1f82: Dependency audit for the next release: remove unused `@orpc/*` dependencies from `@c15t/backend` and `@c15t/node-sdk`, update runtime dependencies (hono 4.12.27, valibot 1.4.2, defu 6.1.7, jose 6.2.3, zod 4.4.3, zustand 5.0.14, xstate 5.32.4, and more), and force security floors for kysely (SQL injection fixes) and protobufjs via workspace overrides. Builds now use TypeScript 7 (native compiler) with rslib 0.23 for type checking and declaration emit; emitted types are semantically unchanged.
- ace6760: Fix IAB TCF in offline mode and on override-driven re-initialization:

  - The `iab()` factory now injects `fetchGVL` into the runtime module, so offline mode (and the hosted fallback path) can load the Global Vendor List. Previously the GVL never loaded and the IAB banner silently never rendered in offline mode.
  - The GVL is requested with the resolved language (`Accept-Language`), so purpose and feature names match the rest of the consent UI.
  - `setOverrides`/`setLanguage` now pass the IAB config through re-initialization, so a language or location change refreshes the GVL instead of keeping a stale one.

- c7e53ff: Forward `x-c15t-version` on backend-bound requests from browser, SSR, prefetch, and Node SDK clients, and allow the header through backend CORS preflight handling.
- ace6760: `getOrCreateConsentRuntime` (the shared runtime behind `ConsentManagerProvider`) now forwards the `headers` option to hosted clients instead of silently dropping it, and includes the headers in the runtime cache key so clients with different headers never share a cached instance.
- e4315bd: Script loader: forward an explicit `async: false` to the injected script element. Dynamically injected scripts are async by default, so vendor helpers documenting synchronous loading (for example legacy Adobe Tags embeds) previously had no effect.
- 5406a8d: Match legal-document policy types (`privacy_policy`, `dpa`, `terms_and_conditions`) by prefix so suffixed variants like `terms_and_conditions_b2b` are accepted, letting multiple policies of one family be active at once. Unknown types are still rejected.
- ca7784f: Prevent duplicate consent records from concurrent identical submissions. Concurrent in-flight client saves with the same intent are coalesced, and backend submissions derive the consent primary key from tenant, subject, domain, policy, and `givenAt`, so identical requests collide on the key every deployed database already enforces. Scope legacy duplicate lookups to the current tenant, and reject timestamps outside JavaScript's representable `Date` range before deriving the ID.
- 30cb116: Clamp client consent `givenAt` timestamps more than five minutes ahead of the server clock to server time before deriving consent validity. Preserve the client's original claim as `metadata.clientGivenAt` and use that claim for consent identity so retries remain idempotent. Sync local consent state to the timestamp recorded by the server. Leave timestamps within the five-minute tolerance and past timestamps unchanged.
- Updated dependencies [1d24803]
- Updated dependencies [05b0abb]
- Updated dependencies [8c004cf]
- Updated dependencies [16a1f82]
- Updated dependencies [c8690f9]
- Updated dependencies [5406a8d]
- Updated dependencies [0c97773]
- Updated dependencies [ca7784f]
- Updated dependencies [c8690f9]
  - @c15t/translations@2.2.0-canary-20260727202135
  - @c15t/schema@2.1.1-canary-20260727202135

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
  - @c15t/schema@2.1.0

## 2.0.4

### Patch Changes

- 748536a: Refine policy category scope handling.
- Updated dependencies [748536a]
  - @c15t/schema@2.0.1

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - @c15t/schema@2.0.0
  - @c15t/translations@2.0.0

## 2.0.0-rc.10

### Patch Changes

- 9579b62: Add token-first legal-document consent groundwork for `2.0`.

  - `c15t`: expand the unstable policy-consent input types so legal-document writes can prefer `documentSnapshotToken`, fall back to `policyHash`, and keep `policyId` only as a compatibility path.
  - `@c15t/backend`: update legal-document consent writes to resolve append-only consent against a verified document snapshot token when configured, or against a provided document hash when only lighter-weight release proof is available.
  - `@c15t/schema`: extend the subject consent schema and error shapes for legal-document snapshot tokens and hash-based legal-document resolution.

- Updated dependencies [9579b62]
  - @c15t/schema@2.0.0-rc.6

## 2.0.0-rc.8

### Minor Changes

- 3d4c107: feat(consent): add change-only consent callbacks

  - add `onConsentChanged` as a dedicated callback for explicit consent saves that change an existing persisted consent state
  - include both previous and current consent categories in the callback payload so analytics and integrations can diff grant/revoke transitions directly
  - keep `onConsentSet` focused on broad consent-state updates, including initialization and auto-grant flows
  - update the React provider to keep callback registrations in sync when callback props change after mount

- c944e35: feat(core): move policy action resolution from @c15t/react to c15t core

  Policy-driven action resolution utilities (`resolvePolicyAllowedActions`, `resolvePolicyActionGroups`, `resolvePolicyPrimaryActions`, etc.) are now exported from `c15t` core for shared consent surface runtimes.

  feat(scripts): move bundled integrations to declarative, schema-versioned `VendorManifest` definitions compiled through `resolveManifest()`. The manifest runtime now supports structured startup and consent phases, complex consent conditions, compile caching, and Google Consent Mode v2 signaling without helper-authored lifecycle overrides.

  feat(dev-tools): add script lifecycle and manifest runtime telemetry to the events and scripts panels, including grouped activity traces for `onBeforeLoad`, `onLoad`, and `onConsentChange`.

### Patch Changes

- 43f1b68: - fix `identifyUser()` to consistently use the consent `subjectId` for `PATCH /subjects/:id`, keep the legacy `id` alias backward compatible, and tighten request typing plus retry handling for malformed pending identify submissions.
- 5956531: Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

  - `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
  - `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
  - `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
  - `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

- Updated dependencies [3d5b0fd]
- Updated dependencies [fee82fd]
  - @c15t/schema@2.0.0-rc.5
  - @c15t/translations@2.0.0-rc.8

## 2.0.0-rc.6

### Minor Changes

- e08e52c: feat: Extract IAB TCF to `@c15t/iab` addon package

  IAB TCF 2.3 support is now an opt-in addon. Non-IAB users no longer pay for IAB code in their bundle.

  **Breaking changes:**

  - `IABConsentBanner`, `IABConsentDialog`, and `useHeadlessIABConsentUI` are no longer exported from `@c15t/react`. Import from `@c15t/react/iab` instead.
  - IAB config now requires the `iab()` wrapper from `@c15t/iab` instead of a plain `{ enabled: true, ... }` object.

  **Migration:**

  ```tsx
  // Before
  import { IABConsentBanner, IABConsentDialog } from '@c15t/react';
  <ConsentManagerProvider options={{ iab: { enabled: true, cmpId: 28 } }}>

  // After
  import { iab } from '@c15t/iab';
  import { IABConsentBanner, IABConsentDialog } from '@c15t/react/iab';
  <ConsentManagerProvider options={{ iab: iab({ cmpId: 28 }) }}>
  ```

  **Bundle impact for non-IAB users:**

  - Core bundle: -3.0 KB gzip (-9.2%)
  - Lazy chunks eliminated: -9.9 KB gzip
  - Total: -12.9 KB gzip (-30%)
  - `@iabtechlabtcf/core` removed from core dependencies

### Patch Changes

- bb3ab0f: chore: update dependencies, including zustand and typescript
- 1a724fc: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

- Updated dependencies [1a724fc]
  - @c15t/schema@2.0.0-rc.4

## 2.0.0-rc.5

### Minor Changes

- 372cf92: feat(policy): add policy packs for declarative regional consent resolution

  Policy packs let you define regional consent rules once — c15t resolves the right policy automatically based on visitor location. Resolution follows fixed priority: region → country → fallback → default.

  - Built-in presets: `europeOptIn()`, `europeIab()`, `californiaOptOut()`, `californiaOptIn()`, `quebecOptIn()`, `worldNoBanner()`
  - Per-policy GPC support via `consent.gpc` field
  - Fallback policies (`match.fallback`) as a safety net when geo-location headers are missing
  - Material policy fingerprints for automatic re-prompting when consent semantics change
  - Policy validation with `inspectPolicies()` for catching misconfigurations before deployment
  - Snapshot tokens (signed JWT) for write-time consistency between `/init` and consent writes
  - Dev-tools match trace panel showing full resolution path

### Patch Changes

- 021ac99: Bundle version-matched docs inside published c15t packages under `docs/**` for local agent and developer reference.

  Remove CLI `AGENTS.md` generation. Use the bundled package docs directly alongside c15t agent skills.

- 5f30a3b: Add browser prefetch utilities for faster consent banner visibility

  - New `buildPrefetchScript()` and `getPrefetchedInitialData()` in `c15t` core to start the `/init` request before framework hydration
  - New `C15tPrefetch` component in `@c15t/nextjs` using `next/script` with `beforeInteractive` strategy for static-route-compatible prefetching
  - Tuned default motion tokens (fast: 80ms, normal: 150ms, slow: 200ms) and replaced hardcoded CSS durations with theme variables

- 58fb392: Rename translation-facing APIs from `translations` to `i18n` across runtime types and helpers.
  Add CLI migration codemods to update existing projects to the new naming.
- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- 58fb392: Rename `c15t` mode references to `hosted` in core runtime and CLI generate flows.
  Add migration codemods and template updates for the hosted vs offline terminology.
- 60a51f1: fix: omit invalid optional subject identifiers when saving consent
- Updated dependencies [cfe1b2e]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [372cf92]
  - @c15t/schema@2.0.0-rc.3
  - @c15t/translations@2.0.0-rc.5

## Unreleased

- Bundle version-matched docs in the published package under `docs/**` for local developer and agent reference.

## 2.0.0-rc.4

### Patch Changes

- 29819bc: feat: add an IAB subpath export and lazy-load IAB internals
- Updated dependencies [06ee724]
  - @c15t/translations@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- 1c813bc: feat(dev-tools): add GPC to dev-tools with an override
- 0f10f3e: fix(react): react compiler compatability
- Updated dependencies [0a18fb6]
  - @c15t/backend@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either inth.com when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB
- Updated dependencies [408df0e]
  - @c15t/backend@2.0.0-rc.2
  - @c15t/schema@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - @c15t/translations@2.0.0-rc.1
  - @c15t/backend@2.0.0-rc.1
  - @c15t/schema@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - @c15t/backend@2.0.0-rc.0
  - @c15t/schema@2.0.0-rc.0
  - @c15t/translations@2.0.0-rc.0

## 2.0.0

### Major Changes

- **Breaking:** `showPopup` and `isPrivacyDialogOpen` replaced with single `activeUI` enum (`'none' | 'banner' | 'dialog'`)
- **Breaking:** `setShowPopup()` and `setIsPrivacyDialogOpen()` replaced with `setActiveUI(ui, options?)`
- feat: add Quebec Law 25 support

### Migration

| Before (1.x)                    | After (2.0)                              |
| ------------------------------- | ---------------------------------------- |
| `state.showPopup`               | `state.activeUI === 'banner'`            |
| `state.isPrivacyDialogOpen`     | `state.activeUI === 'dialog'`            |
| `setShowPopup(true, true)`      | `setActiveUI('banner', { force: true })` |
| `setShowPopup(false)`           | `setActiveUI('none')`                    |
| `setIsPrivacyDialogOpen(true)`  | `setActiveUI('dialog')`                  |
| `setIsPrivacyDialogOpen(false)` | `setActiveUI('none')`                    |

## 1.8.3

### Patch Changes

- 6c28663: Full Changelog: https://c15t.com/changelog/1.8.3

## 1.8.3-canary-20260109181827

### Patch Changes

- 486c46f: fix(core): normalize consent data handling in storage and store

## 1.8.3-canary-20251222100111

### Patch Changes

- 3d8eb68: fix(core): selected consents not updated when consents are auto-granted

## 1.8.3-canary-20251218133143

### Patch Changes

- 9eff7a7: fix(core): disable auto-grant consents when existing consent
- b7fafe6: fix(core): offline mode ignoring overrides

## 1.8.2

### Patch Changes

- 2ce4d5a: \* feat(core): Added ability to disable c15t with the `enabled` prop. c15t will grant all consents by default when disabled as well as loading all scripts by default. Useful for when you want to disable consent handling but still allow the integration code to be in place.

  - fix(react): Frame component CSS overriding
  - fix(react): Legal links using the asChild slot causing multi-child error

  https://c15t.com/changelog/1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- a368512: fix(react): scripts not loading when c15t disabled

## 1.8.2-canary-20251212112113

### Patch Changes

- 7284b23: feat(core): add ability to disable c15t

## 1.8.1

### Patch Changes

- 0f55bf2: fix(core): identified flag not saved in browser storage

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - @c15t/backend@1.8.0
  - @c15t/translations@1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 7043a2e: feat: add configurable legal links to consent banner and consent dialog
- bee7789: feat(core): identify users before & after consent is set
  feat(backend): add endpoint to identify subject with consent ID
  refactor(core): improved structure of client API & removed unused options
- b3df4d0: feat(core): scripts can now be in head and body
- 69d6680: feat: country, region & language overrides

### Patch Changes

- 31953f4: refactor: improve package exports ensuring React has same exports as core
- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [221a553]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [69d6680]
  - @c15t/translations@1.8.0-canary-20251112105612
  - @c15t/backend@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Minor Changes

- a0fab48: feat(core): cookie/local-storage hybrid approach

### Patch Changes

- 8f3f146: chore: update various dependancies
- Updated dependencies [8f3f146]
  - @c15t/backend@1.8.0-canary-20251028143243

## 1.7.0

### Minor Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - @c15t/translations@1.7.0
  - @c15t/backend@1.7.0

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- Updated dependencies [c6518dd]
- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
- Updated dependencies [9f4ef95]
  - @c15t/backend@1.7.0-canary-20251012181938
  - @c15t/translations@1.7.0-canary-20251012181938

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - @c15t/backend@1.6.0
  - @c15t/translations@1.6.0

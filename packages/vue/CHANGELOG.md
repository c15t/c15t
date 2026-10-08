## @c15t/vue@3.0.0-alpha.7 (alpha)

### Keep a Nuxt `manifestSnapshot` intact

A `manifestSnapshot` set under the `c15t` key in `nuxt.config.ts` passed
through public runtime config. Nitro replaces every `null` there with an empty
string during the build, so each policy failed validation and no banner
showed. The snapshot was also sent in every page's payload.

The module now keeps it out of runtime config. The app bundles it unchanged,
and the server's `/api/c15t/manifest` route serves it wherever the module
registers that route: in server manifest mode, and in client mode without a
`manifestURL`.

### Show the Nuxt banner with `buildManifest: true`

With `buildManifest: true`, Nuxt showed no banner to any visitor. The module
stored the build-time manifest in runtime config, where Nitro replaces every
`null` with an empty string during the build. Each policy's `copyRevision: null`
became `''`, so every policy failed with `invalid-configuration`.

The snapshot now ships in the server bundle unchanged, and the
`/api/c15t/init` and `/api/c15t/manifest` routes read it from there.

### Respect `colorScheme: null` in built Nuxt apps

`colorScheme: null` under the `c15t` key in `nuxt.config.ts` leaves
`c15t-dark` to your site. That held in tests but not in built apps: Nitro
replaces every `null` in runtime config with an empty string during the build,
and c15t read the empty string as unset. It then copied the site's `dark` class
into `c15t-dark`, removing a `c15t-dark` the site had set itself. The module
now reads the empty string as `null`.

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

## @c15t/vue@3.0.0-alpha.6 (alpha)

### Support Nuxt 4.6 and Vue Vapor

`@c15t/vue` lists `vue` `^3.5.39 || ^3.6.0-0` as a peer dependency, so it
installs next to `vue@3.6.0-rc` without an `ERESOLVE` conflict. In Nuxt 4.6
apps with `vue.vapor` enabled, Vapor components can render `ConsentRoot`,
`ConsentGate`, `ConsentWidget` and `ConsentPreferencesLink` and call the
composables.

On Nuxt 4.6, `defineAppConfig()` type-checks the `c15t` key in `app.config.ts`
again. With `future.compatibilityVersion: 5`, the build no longer fails, but
`ssr: false` pages get no early `/init` script and the browser starts the
request when the app loads.

### Nuxt server routes follow `NUXT_PUBLIC_C15T_BACKEND_URL`

Setting `NUXT_PUBLIC_C15T_BACKEND_URL` when a built Nuxt app starts moves the
module's `/api/c15t/init` and `/api/c15t/manifest` routes to that backend too.
Before, those routes kept the build-time URL. `NUXT_PUBLIC_C15T_MANIFEST_URL`
works the same way.

Set `NUXT_C15T_BACKEND_URL` or `NUXT_C15T_MANIFEST_URL` only when the routes
should reach the backend at an address the browser does not use, such as an
internal hostname.

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

### Open DevTools from the Vue consent trigger

With `ConsentDevTools` from `c15t/vue/devtools` mounted next to a visible
`ConsentDialogTrigger`, the trigger becomes a two-button toolbar with a DevTools
button, and DevTools hides its floating launcher. The panel opens beside the
toolbar and follows it when dragged. DevTools restores its own launcher when the
trigger is hidden. Style the toolbar with the `components.trigger.toolbar`,
`toolbarItem` and `toolbarIcon` parts.

### Closing the dialog brings back a banner the visitor still owes

Closing preferences with Escape, `closeUI()` or `closeDialog()` left no banner
and no dialog, even when the policy still required a choice. Closing the dialog
leaves the same surface a save would. The banner returns while a choice or
notice is owed. `showConsentSurface(kernel, 'none')` follows the same rule while
the dialog is open.

`useHeadlessIABConsentUI()` from `@c15t/react/iab` no longer flashes the banner
while the TC string encodes. The Vue dialog no longer handles one Escape press
twice.

### Link IAB vendors to their privacy policies

The IAB preference dialog showed empty privacy policy links for every vendor
because GVL v3 dropped the `policyUrl` field. The links now come from each
vendor's `urls[]`, in the dialog's language with English as the fallback.

`@c15t/iab/headless` exports `resolveIABVendorUrls(vendor, language)` for
custom preference UIs, and `processGVLForDialog` takes a `language`.

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

## @c15t/vue@3.0.0-alpha.5 (alpha)

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

### Forward vendors and privacy signals through the Nuxt `/init` proxy

When a backend has no `/manifest`, the Nuxt `/init` route proxies `GET /init` and rebuilds the response. It dropped `vendors`, `vendorListVersion` and `resolvedPrivacySignals` on the way, so a client behind the proxy received no vendor list and none of the privacy signals the backend resolved. The route now forwards all three.

### Vue IAB "Reject all" no longer consents to Purpose 1

"Reject all" on the Vue and Nuxt IAB banner and dialog, and `useConsentIabSave()('none')`, recorded consent to Purpose 1 (store and access information on a device) and encoded it in the saved TC string. "Accept all" and "Reject all" now use the IAB CMP's own `acceptAll()` and `rejectAll()`, which React and Svelte already call. Reject all refuses every purpose, and both actions now record a choice for every vendor, including vendors and custom vendors that declare no consent or no legitimate-interest purposes, so the TC string discloses the same vendors as other frameworks. With no IAB CMP mounted (no valid `cmpId`, or `consentSource` is set), `'all'` and `'none'` now record nothing, as in React and Svelte, instead of saving without a TC string.

**Breaking.** `buildAcceptAllIab()` and `buildRejectAllIab()` are no longer exported from `@c15t/vue/vue-plugin`, `#c15t/composables`, `@c15t/vue/composables/iabSelection`, or the matching `c15t/vue/vue-plugin` and `c15t/vue/composables/iabSelection` entries. Call `useConsentIabSave()` with `'all'` or `'none'` instead.

### One manifest cache for every server adapter

Next.js, Nuxt, SvelteKit, Astro and TanStack Start now read the backend manifest through one function, `fetchCachedManifest` from `@c15t/core/server`, and share one in-process cache of up to 128 entries. Before, SvelteKit and Astro kept a separate 64-entry cache and Next.js a third one, and each took different options.

The cache key is now the same for every caller. Query parameters are sorted by name and the URL fragment is dropped, so `?b=2&a=1` and `?a=1&b=2` read one entry and reach the backend as one request. That request keeps the first caller's URL and query as written, so a signed `manifestURL` still verifies. Request headers that equal the ones the cache sends anyway (`accept: application/json` and the c15t protocol headers) no longer split the cache. The `init` option passes a framework fetch hint such as Next.js `{ next: { revalidate } }` and is not part of the key.

**Breaking.**

- `@c15t/core/libs/manifest-cache` and `c15t/libs/manifest-cache` are removed. Import `fetchCachedManifest` and `clearManifestCache` from `@c15t/core/server` (`c15t/server`) and pass `sourceURL` instead of `url`. The `CachedManifest` type is now `CachedManifestResponse`.
- `fetchCachedManifest` from `@c15t/core/server` and `@c15t/astro/api` takes `sourceURL` instead of `config` (build it with `resolveManifestSourceURL({ backendURL, manifestURL })` from `@c15t/core/server`), and reads the shared cache. The `ManifestSourceConfig` type is removed; use `ManifestSourceOptions`.
- `@c15t/vue/runtime/server/manifest-mode` and `c15t/vue/runtime/server/manifest-mode` are removed. Import the manifest cache and its helpers from `@c15t/core/server` instead, and `resolveManifestInit` and `getResolverInputsFromHeaders` from `@c15t/core/transports/manifest-cache`; `clearManifestRouteCache()` is `clearManifestCache()`.

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

## @c15t/vue@3.0.0-alpha.4 (alpha)

### Resolve Nuxt visitors in the browser on prerendered and cached routes

Nuxt pages that are prerendered, or cached by a `cache`, `swr`, `isr` or `prerender` route rule, no longer carry the consent records, location and request headers of the render that produced them. That HTML is served to every visitor, so it now renders without the banner, and the browser requests the visitor's policy and reads their stored choice after hydration. Before, the browser reused the build-time or first visitor's result and skipped its own policy request, and a visitor who rejected saw the banner again after a reload.

In the browser, a newer denial kept in localStorage now also applies on top of the records the server read from the request cookie, instead of being overwritten by them.

### Apply `theme.slots` in React and Vue

`theme.slots` now styles the stock parts in React and Vue, as it already did in Svelte, Astro and the script tag. Each slot maps onto the matching `components` part (`consentDialogCard` onto `dialog.card`, `toggle` onto `switch.root`), and `components` wins where both set the same attribute. A slot with `noStyle: true` drops that part's stock classes and keeps the slot's and the part's own classes, as in the other adapters; a slot that sets only `noStyle` applies too. React used to accept `theme.slots` in its types and ignore it.

The `frame` and `consentDialogFooter` slot keys are removed: no adapter read them. Style the stock dialog's footer with `consentWidgetFooter`, and the `ConsentGate` placeholder with the new `consentGate` slots.

In Vue, the assigned experiment arm's `theme.slots` merge over the host theme's, as they already did in React, so an arm that changes only a slot renders its classes and styles.

A numeric length in a slot style, such as `{ padding: 8 }`, now renders as `8px` in Vue too. Vue writes style objects as given, so the number used to be dropped.

### Show only necessary when a site declares no categories

A site that declares no categories, through `consentCategories`, scripts, network rules, vendors or discovered frames, now offers only Strictly necessary under a permissive policy, as in v2. The banner still appears when the policy asks for a choice. Accept all, Reject all and Save each record an acknowledgement that keeps the banner dismissed after reload, and hosted and manifest modes send a consent receipt for necessary alone. The acknowledgement expires with the policy's choice validity or a policy change, and a category declared later asks again. Strict policies and IAB TCF policies still offer their whole scope.

The Astro server now judges a visitor against the categories the page's `consentCategories`, `scripts` and network rules declare, so it renders the same banner decision as the browser. Browser `hasConsented()` and the `after-consent` trigger treat the acknowledgement as a decision.

In React Native, the Swift and Kotlin cores apply the same rule when the app sets no `consentCategories`: a permissive policy offers only Necessary, any save records the acknowledgement and sends the necessary-only receipt, and strict policies still offer their whole scope. A declared list now also narrows what Accept all and Reject all confirm, as on the web.

### Load new copy when the Vue consent language changes

Assigning a new language to `useConsentLanguage()` now runs init again, so the banner and dialog switch to that language without a separate `commands.init()` call. Assigning the current language does nothing. The Nuxt `ConsentRoot` now takes the same `language` prop as the Vue `ConsentRoot`.

A `country`, `language` or `region` prop on the Vue or Nuxt `ConsentRoot` no longer runs an extra init on every page load. A prop equal to what the server already resolved, such as the prefetched language, runs none; a different value is sent with the startup init, or with one init when the server prefetched. Init no longer runs during server rendering. Changing a prop after the page has loaded still runs init once.

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

### Fetch a `manifestURL` in the browser from the plain Vue plugin

With the plain Vue plugin, setting `manifestURL` without `manifest` now selects client manifest mode: the browser fetches that manifest and resolves the policy itself. Before, it selected server mode and called `/api/c15t/init`, a route only the Nuxt module registers. The Nuxt module is unchanged: its `manifest` option defaults to `false`, so a `manifestURL` there needs `manifest: 'server'` or `manifest: 'client'` as well.

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

### Show the Vue dialog trigger after the prompt under `after-consent`

`triggerShowWhen: 'after-consent'`, the default, now hides the floating `ConsentDialogTrigger` until the policy owes no prompt: a choice is saved or a notice is dismissed. Before, only `'never'` was checked, so the trigger showed next to an unanswered banner. Set `triggerShowWhen: 'always'` to keep it visible while the banner is open.

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

### Ship the stock dark palette in Vue and Nuxt

The token CSS that Vue and Nuxt write into `<style id="c15t-css-vars">` now carries the stock dark colors under the `.dark` and `.c15t-dark` selectors, as the React and Svelte stylesheet does. With `colorScheme` and `theme` unset, a `dark` class on `<html>` used to switch the class but leave the light colors in place.

### Type `nonce`, `iframeBlocker`, `storageConfig`, `domain` and `app.config.ts` for Nuxt

The Nuxt module options now accept `nonce`, `iframeBlocker`, `storageConfig` and `domain`, which the runtime already read. The `c15t` key of `app.config.ts` is now typed, including when the module is registered as `c15t/vue`, and accepts `networkBlocker.onRequestBlocked`. Module options pass through JSON and cannot hold that callback, so set it in `app.config.ts`.

### Open the preference dialog with focus on its first control

The consent dialog and the IAB dialog used to focus their own container on
open and draw a focus ring around the whole card for keyboard users. They now
focus the first tabbable control inside the panel, the way dialog libraries
such as Base UI do, so the ring lands on a control. Screen readers still
announce the title and description as focus enters, through the panel's
`aria-labelledby` and `aria-describedby`. Blocking banners keep focusing
their container so no action button is favored. `setupFocusTrap` in
`@c15t/ui` takes an `initialFocus` option, and the React hook, Svelte action
and Vue composable pass it through.

### Fix IAB feature styling, accessibility, and Astro script escaping

Apply theme spacing and typography to the IAB feature section. Hide decorative
feature disclosure arrows from screen readers in Vue. Escape Astro client module
paths and adapter names when generating page scripts.

### Add `colorScheme` and dark theme tokens to Vue and Nuxt

The Vue plugin and the Nuxt module accept `colorScheme`, with the same values as the React and Svelte providers. `'light'` and `'dark'` force a scheme, `'system'` follows `prefers-color-scheme` as the visitor changes it, and leaving it unset mirrors a `dark` class on `<html>` into `c15t-dark`. `null` leaves `c15t-dark` to the site. Before, Vue never set `c15t-dark`, so the dark component styles only applied when the site set that class itself.

Both also accept `theme`, the same token object `@c15t/react` takes, including `theme.dark`. Its tokens go into the `<style id="c15t-css-vars">` element with `tokens`, and win where both set a variable. Vue still reads slot overrides from `components`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
	c15t: {
		colorScheme: 'system',
		theme: { dark: { primary: '#7fd1a8' } },
	},
	modules: ['@c15t/vue'],
});
```

Nuxt renders an inline script in `<head>` that sets `c15t-dark` for `'dark'` and `'system'`, with the configured `nonce`, so a dark visitor's first paint is already dark. `generateTokensCSS()` takes the scheme and theme as a second argument for plain Vue server rendering. A plugin given a borrowed `runtime` leaves the class to the host, as it does the tokens.

### Translate the Vue preferences link and match the consent gate placeholder to React

`ConsentPreferencesLink` now defaults to the `consentManagerDialog.title` translation instead of the fixed text "Privacy settings".

The `ConsentGate` placeholder was the fixed text "Content requires permission.". It now renders the same placeholder as the React and Svelte gates: the `consentGate.title` text with the category name and a button labelled with `consentGate.actionButton` that opens the preference center. The gate also adds its category to the categories the preference center lists. Under a strict policy that leaves the category out, the placeholder shows `consentGate.policyBlocked` and no button.

Both components use the visitor's language once init has delivered copy, and English until then. Slot content, including the gate's `placeholder` slot, still replaces the defaults.

### Keep Vue components styled next to Tailwind 4

Vue components import their stylesheets one component at a time, and Vite links those stylesheets ahead of the app's CSS when they share a chunk. The first of them declared `@layer components` before Tailwind 4 declared `base`, so Tailwind's preflight removed the banner's padding, borders and button backgrounds. Each `@c15t/ui/styles/components/*.css` file now opens with Tailwind 4's layer order, `@layer properties, theme, base, components, utilities;`, as the aggregate stylesheets already did.

The dialog trigger stylesheet now keeps its rules in `@layer components` as well, so a Tailwind utility passed to the Vue trigger overrides it the same way it does in React.

### Support IAB TCF 2.4

c15t now follows TCF 2.4 and TCF Policies v5.0.b. Existing TC strings stay valid.

- The IAB preference centre shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- GVL schemas keep unknown fields, so `standardTexts` survives the backend cache.

### Migration

Headless IAB UIs: `resolveIABDialogDisplayModel` now returns Features in `featureRows` instead of `essentialRows`. Render them without a control, under `featuresStandardText` or your `features.description` translation when it is `null`.

### Inspect consent from a c15t tab in Nuxt DevTools

In development, the Nuxt module adds a c15t tab to Nuxt DevTools. The tab shows the DevTools panels for the app's consent kernel, including events and consent actions, and follows the DevTools light or dark theme. Production builds don't register the tab. Set `devtools: false` in the module options to turn it off.

`c15t/vue/devtools` and `@c15t/vue/devtools` now export `ConsentDevToolsPanel`, which fills its parent element instead of floating over the page. `createDevTools` accepts `embedded: true` for the same layout, and can render into a same-origin iframe while it inspects the page that owns the kernel.

Embedded panels, including the TanStack Devtools plugin from `c15t/react/devtools`, no longer show their own c15t header, because the host already names the panel.

### Accept `disableAnimation` on the Vue banners and dialogs

`consent-banner.vue`, `consent-manager.vue` and the IAB banner and dialog take a `disableAnimation` prop that overrides the config's `disableAnimation` for that surface, as the React components do. Left unset, they follow the config.

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

### Keep `colorScheme: null` in Nuxt

`colorScheme: null` under the `c15t` key of `nuxt.config.ts` or in `app.config.ts` now leaves the `c15t-dark` class on `<html>` to the site, as it does in Vue, React and Svelte. Nuxt merges options in a way that drops `null`, so it used to behave like an unset `colorScheme` and copy a `dark` class. A `null` passed as inline module options (`modules: [['@c15t/vue', { colorScheme: null }]]`) is still dropped by Nuxt before the module sees it; set it under the `c15t` key instead.

### An undeclared vendor reads as not allowed

Breaking change: reading vendor consent for an id that no `vendors` entry, script slug or backend vendor list declares now returns `false`. Before, React's `useVendorAllowed`, Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` returned `true` for such an id without checking any category, so a typo or a missing declaration read as allowed before the visitor consented. In development, c15t logs one warning per undeclared id that names the missing declaration. Declare every vendor you read, for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The rule lives in one helper, `isVendorAllowed(snapshot, vendorId, now?)`, exported from `c15t` and `@c15t/core`. A declared vendor keeps its behaviour: it is allowed when its category condition passes and, outside an IAB policy, the visitor has not switched it off.

Vue gains `useVendorAllowed(vendorId)`, which returns a computed boolean and is auto-imported in Nuxt. The Svelte consent manager from `getConsentManager()` gains `isVendorAllowed(vendorId)`.

Scripts, iframes and network rules that carry an undeclared `vendor` slug are gated as before: they follow their category.

### Pass `shadow` from `ConsentDevTools` to the DevTools panel

`ConsentDevTools` in `@c15t/svelte`, `@c15t/react` and `@c15t/vue` accepted
`shadow` in its props type but never passed it to `createDevTools`, so the
panel always mounted inside a shadow root. The Vue component did not
declare the prop at all. `shadow={false}` now mounts the panel in the light
DOM, with its stylesheet in `<head>`, as the `@c15t/dev-tools` option
describes. Leaving `shadow` out keeps the shadow root.

### Auto-import the experiment composables in Nuxt

Nuxt auto-imports `useExperiment()` and `useResolvedPresentation()`, so a page can read the assigned banner-experiment arm without importing from `c15t/vue/vue-plugin`.

### Apply Vue theme tokens before the first paint

The Nuxt module now adds the `tokens` CSS variables to the page head from its plugin, so server-rendered and prerendered HTML carries them on every page, with the configured `nonce`. The plain Vue plugin adds them to `document.head` when it is installed, before the first render, and removes them when the last app using them unmounts. A second app on the same page reuses the element, and a `<style id="c15t-css-vars">` rendered by the server is left in place. Before, the Vue `ConsentRoot` set them only after mount, so the first paint used the defaults, and surfaces composed without a `ConsentRoot` never got them.

For plain Vue apps rendered on the server, `generateTokensCSS()` from `@c15t/vue/vue-plugin` returns the same CSS to put in a `<style id="c15t-css-vars">` element in the server HTML.

### Stop the floating trigger's transitions when `disableAnimation` is set

The floating dialog trigger and the trigger toolbar now carry `data-disable-animation` when the provider's `disableAnimation` is on, and the stylesheet then drops their hover and snap-to-corner transitions. They already stop under `prefers-reduced-motion: reduce`.

## @c15t/vue@3.0.0-alpha.3 (alpha)

### Mount collapsed preference content on first open

**Breaking.** A collapsed row in the preferences dialog or `ConsentWidget` no longer renders its content until it first opens. This applies to category rows, vendor cards and IAB purpose, stack and vendor rows. The content element is still rendered, empty, so the trigger's `aria-controls` target exists. Its children mount the first time the row opens and then stay mounted, so the close transition keeps its content. Collapsed content was already `inert` and `aria-hidden`, so keyboard and screen-reader behavior does not change.

Opening the dialog used to mount every vendor card inside the collapsed categories. With 100 declared vendors that was 1,625 React components and 1,811 DOM nodes. It is now 112 components and 103 nodes, the same as with no vendors, and the React commit at 4× CPU slowdown drops from 36 ms to 13 ms.

### Migration

- Tests that read a category description, vendor card or vendor details before opening its row: open the row first. `consent-widget-accordion-content-*` and `consent-widget-vendor-content-*` still exist while collapsed, but they are empty.
- Custom compositions of the `PreferenceItem` primitive that need collapsed children in the DOM, for example because custom CSS shows them: pass the new `forceMount` prop to the content part (`PreferenceItem.Content` in React and Svelte, `PreferenceItemContent` in Vue).

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

### Accept `networkBlocker` in the Vue plugin, Nuxt module and Astro integration

The plain Vue plugin started the network blocker when its options carried `networkBlocker`, but `C15tVuePluginOptions` did not include the option, so passing it was a type error. The plugin's options type now covers everything it starts on mount: `networkBlocker`, `iframeBlocker`, `scripts`, `storageConfig` and `nonce`. `RuntimeConsentConfig` and `UseNetworkBlockerOptions` are exported from `@c15t/vue/vue-plugin`.

The Nuxt module accepts `networkBlocker` in `nuxt.config.ts` under `c15t`, without `onRequestBlocked`, because module options reach the browser as JSON.

The Astro integration ignored network blocking entirely. It now takes `networkBlocker` in the integration options, and in the client extension when you need `onRequestBlocked`.

### Close consent surfaces without waiting for the backend

Save, Accept all and Reject all now close the preference dialog in the same
task as the click, in React, Next.js, TanStack Start, Vue, Nuxt, Svelte,
Astro's dialog islands and the browser client. The choice, storage, scripts,
iframes and network rules update from the local record first; the backend
request runs afterwards. Before, the dialog stayed open until the request
answered. In a Next.js production build with 170 ms of network latency, a 4x
CPU slowdown and a 200 ms backend, Save now closes the dialog after 18 ms
instead of 486 ms. The browser client's
banner waited the same way and now closes on the click too. IAB banners and
dialogs close on the click and come back only if the choice could not be
recorded locally, for example when the vendor list failed to load.

A failed request no longer keeps the dialog open or reopens it. The choice
stays, the failure reaches `onError` and the kernel's `command:error` event,
and the kernel replays the queued save after the next initialization or when
the browser comes back online.

Callback timing is unchanged: `onChoiceRecorded` and `onPermissionsChanged`
still run in the click task, and the promises returned by `performAction()`,
`saveConsents()` and the browser client's `save()` still settle when the
request does. Svelte's `ConsentButton` no longer leaves an unhandled rejection
when a save fails.

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and reload the page when the source withdraws a granted category, using the existing `reloadOnConsentRevoked` option and `onBeforeConsentRevocationReload` callback. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

Keep disabled runtimes permissive when an external source is configured. Complete browser readiness after connecting the source, keep Astro preference triggers available, and reject IAB saves owned by an external CMP. External permissions disable c15t IAB authority. Deliver events for built-in Umami, Rybbit and Matomo integrations, and preserve custom GTM queue names during initialization and dispatch.

Report external CMP subscription failures without aborting provider startup. Keep optional permissions denied and ignore notifications from the failed connection.

### `useNetworkBlocker` holds matching requests from its first render

The standalone `useNetworkBlocker` hook installed the blocker from a mount effect. Effects in the calling component's children, and in components rendered before it, run first, so matching `fetch` and XHR requests sent from them went out without a consent check on first visits and for visitors who had rejected. The hook now holds matching requests from the first render of the component that calls it, the same way the provider's `networkBlocker` option does since the previous release, and the blocker decides them once it loads.

Holds are now tracked per caller. When a page uses both the provider option and the hook, one blocker loading or one component unmounting no longer releases requests that the other's rules still hold. A blocker configured with `enabled: false` holds nothing and no longer sends requests another caller holds. `createConsentRuntime()` (which the Svelte, Astro and browser packages use) and the Vue plugin follow the same rules, and a runtime or Vue context disposed before it starts ends only its own hold. The requests it held are answered as blocked (a 451 response for `fetch`, a failed XHR) rather than sent, since nothing checked consent for them.

### Migration

The hook's first render in the browser now has a side effect: it patches `fetch` and `XMLHttpRequest` to hold requests that match its rules. On the server it still does nothing. If React discards that render and never commits it (a render that throws, or an attempt thrown away while suspending), the hold ends after 10 seconds and the requests it held fail as blocked (a 451 response for `fetch`, a failed XHR), since nothing checked consent for them. The same applies when the hook's component, or the provider, unmounts before its blocker loads. No code changes are needed. If a test asserts that `window.fetch` is untouched after rendering a component that calls the hook, update it: during the first render `window.fetch` is the hold's wrapper, and after the blocker loads it is the blocker's.

### Stop Nuxt pages from downloading every locale on first load

In a Nuxt 4 build, every page downloaded the all-locale translations chunk (about 57 KB gzip, 206 KB raw) in its first load, in server manifest mode, hosted mode and client manifest mode alike. Only client manifest mode uses it. The Vue runtime imported the manifest resolver and the translations with two separate `import()` calls, and Vite 8 put a helper that the app entry needs into the translations chunk, so the entry loaded that chunk statically.

The runtime now loads both through one module. Server manifest and hosted mode no longer download the translations. Client manifest mode, which resolves the manifest as the page starts, now bundles the resolver with the entry through a plugin the Nuxt module adds in that mode, so the page still preloads it. Plain Vue apps built with Vite were not affected and load the same code as before.

### Reload the page when a visitor revokes consent

Revoking consent removed a vendor's script element but left its code running. Listeners, timers, history hooks and chat widgets kept working until the next full page load. v2 reloaded the page on revocation, and v3 lost that behaviour when the consent policy contracts were unified.

When an accept, reject or save turns off a category or vendor that was granted, the page now reloads after every in-flight save request settles, so the next page runs only permitted code. `onBeforeConsentRevocationReload` runs just before the reload. A first visit that rejects under opt-in does not reload, because nothing gated had run. Rejecting defaults under opt-out does, because gated code ran before the choice. Expiry, policy changes and privacy signals do not reload.

Set `reloadOnConsentRevoked: false` to turn this off. The option is available on `ConsentProvider`, `ConsentRoot` `options`, `createConsentRuntime()`, the Vue plugin config, the browser client, and the Astro integration. `@c15t/svelte` receives it through its runtime options.

### Re-render Vue components only when their consent value changes

`useHasConsent()`, `useConsentInit()` and `useConsentPolicyActions()` returned a new array or object on every kernel update, so a component reading one re-rendered whenever anything changed, including opening the dialog. They now keep their previous value while its contents are unchanged. A component using `useHasConsent()` re-renders when a category is granted or revoked, and one using `useConsentInit()` when translations, location, branding or IAB data change. The stock banner, dialog and preference widget read these values too, and follow the same rule.

### Load the Vue dialog's stylesheet with the dialog

The stock banner's description imported the dialog's style map, and a style map brings its stylesheet with it. So every page with the banner loaded the dialog's rules up front; in Nuxt they were part of the render-blocking entry stylesheet (14.7 KB raw, 2.3 KB gzip). The banner now renders its description without the dialog's map, and the dialog's rules load with the dialog's own chunk. `ConsentDescription` keeps its props and output.

### Load each component stylesheet rule once

Apps that import `styles.css` no longer download component rules a second time. The `@c15t/ui/styles/components/<name>` class maps used to import their own CSS, so bundlers such as Next.js with Turbopack emitted extra stylesheets for the banner, actions, legal links and consent gate on first load, and for the dialog when it opened, all duplicating rules already in `styles.css`. Class maps now carry no CSS, and `styles.css` stays the single source for React, Next.js, TanStack Start, Svelte and Astro.

Vue components still include their styles: they now import the matching `@c15t/ui/styles/components/<name>.css` files directly, and Vue apps emit the same CSS as before.

If you imported `@c15t/ui/styles/components/<name>` class maps in your own components and relied on them to load CSS, import `styles.css` once, or import the matching `<name>.css` file.

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

### Block network requests sent before the network blocker loads

The network blocker loaded after mount, so a `fetch` or XHR that matched a rule and was sent from a child component's mount effect, from an effect next to the provider, or from a client module evaluated inside it went out without a consent check. This happened on first visits, for visitors who had rejected, and when the policy request failed or hung. `ConsentProvider` and `ConsentRoot` now hold matching requests from their first render in the browser, and the blocker decides them once it loads. Vue holds them from plugin install until the root mounts. `createConsentRuntime()`, which `@c15t/svelte` and the `c15t` browser client use, holds them from construction until `start()`. A provider that unmounts before its blocker loads, a runtime disposed before `start()`, or a Vue context disposed before its root mounts answers the requests it held as blocked (a 451 response for `fetch`, a failed XHR) rather than sending them, since nothing checked consent for them. Requests another caller still holds keep waiting.

While consent is unknown, a matching request that would be blocked now waits instead of failing. It is sent if the resolved policy and the visitor's stored choice allow it, and blocked if they do not or if the policy fails to load. Requests that match no rule are not delayed. Apps without `networkBlocker` still do not download the blocker; the hold adds about 0.8 KB gzip to first-load JavaScript.

Requests made before the provider renders are still out of reach, including inline scripts, tags loaded before hydration, and client modules that webpack evaluates when a route's chunk loads. The new network blocker pages for Next.js and React describe these limits and how to keep tracking calls out of that window.

## @c15t/vue@3.0.0-alpha.2 (alpha)

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

### Restore category discovery and consent completion

Restore category discovery from scripts, frames, and network rules. Merge discovered categories with `consentCategories` within the policy scope, and use the same set for the dialog and consent completion. Keep the banner dismissed after accepting the displayed categories and reloading. Enable tagged iframe discovery and blocking by default in React, matching the shared runtime.

# @c15t/vue

## 3.0.0-alpha.1

### Minor Changes

- dd44a61: Add opt-in `clearOnRevocation` configuration to remove declared cookies, localStorage keys, and sessionStorage keys when their consent category is denied or revoked. Support exact names, prefix patterns, and cookie scopes while protecting c15t consent records.

### Patch Changes

- Updated dependencies [dd44a61]
- Updated dependencies [46f45c4]
  - @c15t/core@3.0.0-alpha.1
  - @c15t/ui@3.0.0-alpha.1
  - @c15t/dev-tools@3.0.0-alpha.1
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
  - @c15t/dev-tools@3.0.0-alpha.0
  - @c15t/iab@3.0.0-alpha.0
  - @c15t/schema@3.0.0-alpha.0
  - @c15t/translations@3.0.0-alpha.0
  - @c15t/ui@3.0.0-alpha.0

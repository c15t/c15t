## @c15t/browser@3.0.0-alpha.5 (alpha)

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

### Remove the v2 `jurisdiction` label and `disableGeoLocation`

v3 decides consent from policy rules, so the regulation label v2 derived from a fixed country table (`GDPR`, `CCPA`, `NONE` and so on) is gone from the API.

- `/init` responses and session reports no longer carry `jurisdiction`, so `sessions.onReport` no longer receives it. Read the matched policy from `policyResolution`, or the report's `policy`, `country` and `region`.
- `@c15t/schema` removes `jurisdictionCodes`, `jurisdictionCodeSchema`, `JurisdictionCode` and `checkJurisdiction`. `@c15t/core` and `c15t` remove the unused `LocationInfo`, `ConsentBannerResponse` and `JurisdictionCode` types.
- The `disableGeoLocation` manifest option is removed. To show every visitor the same banner, configure one policy rule with `match: { isDefault: true }`; the browser resolves it without a location. To test a region's rule, set the country in the client's `overrides`, for example `overrides: { country: 'US' }`.
- The `/init` translations schema is now one shape with optional keys. `completeTranslationsSchema`, `partialTranslationsSchema` and the `partial*` section schemas are removed, along with the deprecated `frame` key, which the backend already folds into `consentGate`. `titleDescriptionSchema` now accepts a pair with `title` or `description` missing, so its inferred type has both fields optional.
- The backend still accepts `jurisdiction` in a save request from a 2.x client and ignores it. Policy snapshot tokens no longer carry the claim, and tokens that still do are accepted.
- Migration 7 makes `runtimePolicyDecision.jurisdiction` nullable; new decisions store `null` and 2.x rows keep their value. Apply it with `@c15t/cli self-host migrate --apply` before deploying this backend.

## @c15t/browser@3.0.0-alpha.4 (alpha)

### Update documentation links

Point documentation links in CLI prompts and errors, runtime warnings, TSDoc, package READMEs and package homepages at the current c15t.com docs pages. The old addresses led to pages that were moved or removed.

### Show only necessary when a site declares no categories

A site that declares no categories, through `consentCategories`, scripts, network rules, vendors or discovered frames, now offers only Strictly necessary under a permissive policy, as in v2. The banner still appears when the policy asks for a choice. Accept all, Reject all and Save each record an acknowledgement that keeps the banner dismissed after reload, and hosted and manifest modes send a consent receipt for necessary alone. The acknowledgement expires with the policy's choice validity or a policy change, and a category declared later asks again. Strict policies and IAB TCF policies still offer their whole scope.

The Astro server now judges a visitor against the categories the page's `consentCategories`, `scripts` and network rules declare, so it renders the same banner decision as the browser. Browser `hasConsented()` and the `after-consent` trigger treat the acknowledgement as a decision.

In React Native, the Swift and Kotlin cores apply the same rule when the app sets no `consentCategories`: a permissive policy offers only Necessary, any save records the acknowledgement and sends the necessary-only receipt, and strict policies still offer their whole scope. A declared list now also narrows what Accept all and Reject all confirm, as on the web.

### Let the page decide the scheme with `colorScheme: null`

`mountConsentUI()` and `init()` accept `ui.colorScheme: null`, and the script tag accepts `data-color-scheme="none"`. The UI is then dark while `<html>` has a `dark` or `c15t-dark` class, and follows the class as the page changes it. The UI renders in a shadow root that the page's class cannot reach, so c15t copies it onto the UI host. Before, the only choices were `light`, `dark` and `system`, and the default stays `system`.

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

### Use the theme's motion tokens on the floating trigger

The floating dialog trigger now times its hover and snap transitions with `--c15t-duration-slow`, `--c15t-easing-out` and `--c15t-easing-in-out`. It read variables no theme sets, so `theme.motion` never reached it.

### Pass a CSP nonce and the remaining runtime options through `@c15t/browser`

`init()` and `createConsentClient()` accept a `nonce` option. The stock UI's `<style>` element and every `<script>` the `scripts` option loads carry it, so the banner renders under a Content Security Policy that allows styles or scripts by nonce instead of `'unsafe-inline'`. Before, the injected `<style>` element had no nonce and a nonce-based `style-src` blocked the whole stylesheet.

The script tag reads the nonce from `data-nonce`, or from the tag's own `nonce` attribute when `data-nonce` is absent, so `<script nonce="..." src=".../c15t.js">` needs no extra configuration.

With a nonce configured, inert `<script type="text/plain" data-c15t-category>` tags run only when they carry that same nonce. Other tags are skipped with a console warning and marked `data-c15t-activated="untrusted"`. c15t runs an inert tag by creating a new `<script>` element, and a policy with `'strict-dynamic'` runs scripts created by trusted code without checking for a nonce. Without this check, a tag injected through an HTML-injection hole would run as soon as its category was granted, whether it was inline or had a `src`. The configured nonce is never copied onto an inert tag. Add `nonce="..."` to your own gated tags, including ones your code inserts later. Pages without a configured nonce activate inert tags as before. `activateGatedScripts()` takes the same check as a `nonce` option. Passing a different nonce on a later call for the same root replaces the earlier one, so a first call made before the page knew its nonce no longer leaves that root open to tags without it.

The client also passes `vendors`, `persistence` and `scriptLoader` to the consent runtime. Before, all three were ignored.

### Replay every queued script-tag call

Calls pushed onto `window.c15t` before the script loads now all run. Before, queueing any method other than `config`, `on` or `onInit` threw during replay and dropped every call queued after it.

`config`, `init`, `on` and `onInit` still run in place. `subscribe` attaches once the client exists. Actions such as `openDialog`, `showBanner`, `acceptAll`, `rejectAll`, `save`, `setLanguage` and `identify` run in queue order once the policy has resolved, so a queued `openDialog` is not replaced by the banner. Methods that only return a value, such as `getSnapshot` or `has`, and unknown names are skipped with a console warning. A queued call that throws is reported with `console.error` and the calls after it still run.

`window.c15t.push([...])` also works after the script has loaded: it runs each call the same way as a call queued before load. Actions from separate `push()` calls also run in order: each batch waits for the actions from earlier calls to settle, so `c15t.push(['acceptAll']); c15t.push(['rejectAll']);` always ends with consent rejected. `c15t.dispose()` drops actions that have not run yet, so they never reach the disposed client or the one a later `init()` creates, and actions pushed after it run as usual. Actions that a listener pushes while a batch runs `init`, for example from a `ready` listener, run after that batch's own actions. A snippet written as `window.c15t = window.c15t || []; c15t.push([...])` no longer throws when it runs after the tag.

### Open the preference dialog without animation when `disableAnimation` is set

The Svelte and script-tag preference dialogs no longer fade and scale in when `disableAnimation` is on. Their overlay and panel now carry `data-disable-animation`, as the Vue dialog does.

### Report banner impressions and time to decision

Report banner and dialog impressions, not only choices. The kernel emits a `surface:shown` event when the banner or the dialog becomes visible and records the first impression time of each surface in `snapshot.surfaceShownAt`, so a late subscriber can still read it. Provider callbacks gain `onSurfaceShown` (React and Vue/Nuxt `callbacks.onSurfaceShown`); `@c15t/browser` dispatches `c15t:surfaceShown`; dev-tools log the event. A recorded choice now carries `timeToDecisionMs` (impression to action) on the `choice:recorded` event, on `onChoiceRecorded`, and on the saved consent as `metadata.timeToDecisionMs`. `kernel.commands.save()` accepts a `uiSource` override, and the React `uiSource` prop now reaches the save payload, so `ConsentWidget` saves are attributed to `widget` instead of the active banner. The never-fired `onBannerFetched` callback and `OnBannerFetchedPayload` type are removed.

`kernel.markLive()` is public: an adapter that renders from a server-resolved prefetch and never calls `init()` calls it after hydration, so the server-rendered banner still counts as an impression. The core runtime, the React provider (and so Next.js and TanStack Start) and the Vue runtime (and so Nuxt) do this; before, an SSR page with a resolved prefetch never emitted `surface:shown`.

`consentAction` on a saved choice now stays `all` or `necessary` when the host displays only a subset of the policy scope (`consentCategories`). It names the action the visitor took; `confirmed` names the categories it covered. Before, a narrowed accept-all was recorded as `custom`.

A choice saved while a `notice` prompt is owed now records the notice dismissal with it. Before, a visitor who opened the preference center from an opt-out notice and rejected was shown the notice again.

### Style stock UI parts with `theme.slots`, `::part()` and `stylesheetURLs`

The banner, preference centre, floating trigger and IAB surfaces now apply `ui.theme.slots`, the per-part class and style map `@c15t/ui` and `@c15t/svelte` already read. A slot such as `consentBannerCard`, `consentDialogCard`, `consentDialogTrigger`, `buttonPrimary` or `toggle` takes a class string or `{ className, style }`, and `noStyle: true` on a slot replaces that part's stock classes. Slot classes stay when `ui.noStyle` is set.

Each of those parts also carries its slot key in a `part` attribute, so page CSS can style it inside the shadow root with `[data-c15t-ui]::part(consentBannerCard)`.

A class from the page's stylesheet only reaches a part with `shadow: false`. In the default shadow root, the new `ui.stylesheetURLs` option links stylesheets inside it, after the bundled one and with the client's nonce, so Tailwind, CSS Modules or vanilla-extract classes apply there too. The script tag accepts both through `c15t.push(['config', { ui: { … } }])`.

A slot's numeric `style` values get `px` where the property takes a unit, as React writes them: `{ padding: 8 }` renders `padding: 8px`, while `opacity`, `zIndex`, `flexGrow`, `lineHeight` and the other unitless properties keep the bare number. An experiment arm's `theme.slots` apply to the parts of visitors assigned that arm, merged over the host theme's slots. When the arm changes after the UI mounts, the floating trigger and its icon drop the previous arm's slot classes and styles and take the new arm's.

### Close the preference dialog on Escape wherever focus is

The stock preference dialog now closes on Escape even when focus is outside it, as the React and Vue dialogs do. Before, a non-blocking dialog, which does not trap focus, closed only when focus was inside it.

### Apply `generateThemeCSS` output wherever it lands in the page

A theme rendered with `generateThemeCSS` used the same selectors as the
default tokens in `styles.css`, so whichever came later in the document won.
SvelteKit writes `<svelte:head>` content before its stylesheet links, so a
theme rendered there, as the SvelteKit guide shows, was replaced by the
defaults. The generated selectors now carry one more specificity point
(`:root:root`, `.c15t-theme-root.c15t-theme-root`), so in the document the
theme overrides the defaults before or after the stylesheet. Inside a shadow
root, `:host` keeps the defaults' specificity, so the theme still has to come
after the stylesheet there; the script tag's mount already writes it last.
This covers `ConsentTheme` in
React, Next.js and TanStack Start, Astro's server-rendered theme and the
script tag's `theme` option too.

Your own CSS that sets `--c15t-*` variables on plain `:root` next to a
generated theme now loses to the theme. Put those values in the theme, or
raise the selector to `:root:root`.

### Check iframes on demand with `processIframes()`

`iframeBlocker: { disableAutomaticBlocking: true }` is now usable outside React. The consent runtime from `@c15t/core/runtime` has a `processIframes()` method, and `@c15t/browser` exposes it as `client.processIframes()` and `c15t.processIframes()`. Each call pauses gated frames (`data-category` or `data-vendor`) that consent does not allow and restores the ones it does. With automatic blocking on, the blocker still does this by itself. `c15t.push(['processIframes'])` runs once the policy has resolved.

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

### Set `disableAnimation` per surface and from the script tag

The `banner` and `dialog` UI options accept `disableAnimation`, which overrides the UI-level `disableAnimation` for that surface. The script tag reads `data-disable-animation` to turn animations off for the whole UI.

```html
<script src="https://cdn.jsdelivr.net/npm/@c15t/browser@alpha/dist/c15t.js" data-disable-animation></script>
```

### Keep dispatching client events when a listener throws

A listener registered with `on()` that throws no longer stops the listeners after it or the matching `c15t:*` document event. The error is logged with `console.error`. This also covers the `ready` and `ui` listeners that `on()` calls at once after the policy has resolved, so `on()` still returns its unsubscribe function.

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

### Keep fixed elements still when a consent dialog locks scrolling

A blocking banner or dialog no longer shifts the page sideways on systems that show classic scrollbars, such as Windows, Linux and macOS with "Always show scrollbars" enabled. The scroll lock used to pad `<body>` by the scrollbar width, which kept in-flow content in place but still widened the viewport, so fixed headers, right-aligned controls and side panels jumped by the scrollbar width. It now sets `scrollbar-gutter: stable` on `<html>` while the page is locked, so the viewport keeps its width. Pages without a visible scrollbar get no gutter, and a `stable` gutter the page already sets is left alone. Browsers without `scrollbar-gutter` support still get the `<body>` padding.

The lock now also works on pages that set `overflow` on `<html>`, where hiding `<body>` overflow alone did not stop the page scrolling, and it restores inline `overflow-x` or `overflow-y` values it replaced instead of clearing them.

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

### Keep checked switches inside their track in right-to-left languages

In Arabic, Hebrew and other right-to-left copy, a checked switch in the preference dialog now moves its thumb to the left end of the track. The rule only matched a `dir` attribute on the switch itself, which no adapter sets, so the thumb slid past the track's edge.

### An undeclared vendor reads as not allowed

Breaking change: reading vendor consent for an id that no `vendors` entry, script slug or backend vendor list declares now returns `false`. Before, React's `useVendorAllowed`, Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` returned `true` for such an id without checking any category, so a typo or a missing declaration read as allowed before the visitor consented. In development, c15t logs one warning per undeclared id that names the missing declaration. Declare every vendor you read, for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The rule lives in one helper, `isVendorAllowed(snapshot, vendorId, now?)`, exported from `c15t` and `@c15t/core`. A declared vendor keeps its behaviour: it is allowed when its category condition passes and, outside an IAB policy, the visitor has not switched it off.

Vue gains `useVendorAllowed(vendorId)`, which returns a computed boolean and is auto-imported in Nuxt. The Svelte consent manager from `getConsentManager()` gains `isVendorAllowed(vendorId)`.

Scripts, iframes and network rules that carry an undeclared `vendor` slug are gated as before: they follow their category.

### Stop banner and dialog motion under reduced motion in every adapter

The `prefers-reduced-motion: reduce` rules now use the same selectors as the rules that animate each part, so they win wherever an adapter puts the class. They were one class lighter for the banner and dialog, so Vue, Nuxt and Astro banners still slid in for visitors who asked for less motion. The fix also covers the sidebar dialog, secondary and dark button hovers, tab triggers, the accordion row and the IAB tab indicator.

### Granular vendor consent in Astro and the script tag

Astro and `@c15t/browser` now support per-vendor consent like the other adapters. A visitor can allow a category and still turn one vendor off.

In Astro, pass `vendors` to `c15t()`. Vendors from the backend manifest are merged in. The preference dialog lists each category's vendors with a switch per vendor for the React, Vue and Svelte islands. The switches edit the draft and are saved with Save. They are disabled while the category is off and cleared by Accept all and Reject all. `getConsentClient()` gains `getDeclaredVendors()`, `getVendorChoice()` and `isVendorAllowed(vendorId)`, and `save()` accepts a `vendors` map. The server now asks about the categories that code-declared vendors sit in, so its banner decision matches the browser's.

In `@c15t/browser`, declare vendors with the `vendors` option or `c15t.push(['config', { vendors }])`. The stock preference centre lists vendor switches with the same behaviour and the `@c15t/ui` vendor list styles and translations. The client and `window.c15t` gain `getDeclaredVendors()`, `getVendorChoice()` and `isVendorAllowed(vendorId)`. `save()` now forwards a `vendors` map instead of dropping it, so `c15t.push(['save', { measurement: true, vendors: { posthog: false } }])` works. A change to vendors alone now emits `consent` and runs gated tags that were waiting.

Both adapters gate inert `<script type="text/plain" data-c15t-category="…">` tags by vendor when the tag also carries `data-c15t-vendor="…"`, and gate iframes that carry `data-vendor`. The nonce rule for gated tags is unchanged.

### Stop the floating trigger's transitions when `disableAnimation` is set

The floating dialog trigger and the trigger toolbar now carry `data-disable-animation` when the provider's `disableAnimation` is on, and the stylesheet then drops their hover and snap-to-corner transitions. They already stop under `prefers-reduced-motion: reduce`.

## @c15t/browser@3.0.0-alpha.3 (alpha)

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

### Ship only the styles the script-tag surfaces use

`c15t.js` and `c15t.iab.js` inline `@c15t/ui`'s stylesheet, which also styles
surfaces this package never renders: the headless primitives, the vendor list,
tabs and collapsible parts outside the IAB dialog, and the ConsentGate
placeholder. The build now keeps only the rules that can match the class maps
the banner, preference dialog, trigger and IAB surfaces render. `c15t.js` is
about 4.3 KB smaller gzipped and `c15t.iab.js` about 7.6 KB. `c15t.css` and
`c15t.iab.css`, the same sheets for light-DOM mounts, shrink the same way.
Rendering is unchanged.

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

### Reload the page when a visitor revokes consent

Revoking consent removed a vendor's script element but left its code running. Listeners, timers, history hooks and chat widgets kept working until the next full page load. v2 reloaded the page on revocation, and v3 lost that behaviour when the consent policy contracts were unified.

When an accept, reject or save turns off a category or vendor that was granted, the page now reloads after every in-flight save request settles, so the next page runs only permitted code. `onBeforeConsentRevocationReload` runs just before the reload. A first visit that rejects under opt-in does not reload, because nothing gated had run. Rejecting defaults under opt-out does, because gated code ran before the choice. Expiry, policy changes and privacy signals do not reload.

Set `reloadOnConsentRevoked: false` to turn this off. The option is available on `ConsentProvider`, `ConsentRoot` `options`, `createConsentRuntime()`, the Vue plugin config, the browser client, and the Astro integration. `@c15t/svelte` receives it through its runtime options.

## @c15t/browser@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Restore category discovery and consent completion

Restore category discovery from scripts, frames, and network rules. Merge discovered categories with `consentCategories` within the policy scope, and use the same set for the dialog and consent completion. Keep the banner dismissed after accepting the displayed categories and reloading. Enable tagged iframe discovery and blocking by default in React, matching the shared runtime.

# @c15t/browser

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

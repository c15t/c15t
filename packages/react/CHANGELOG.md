## @c15t/react@3.0.0-alpha.5 (alpha)

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

## @c15t/react@3.0.0-alpha.4 (alpha)

### Resolve a relative backendURL against the request, not forwarding headers

A relative `backendURL` or `manifestURL` no longer resolves against client-controlled forwarding headers. The server helpers previously built the backend origin from `x-forwarded-host`, `x-forwarded-proto` or `referer` when present, so a request that set them could make the server send its `/init` or manifest request, with the request's cookies and forwarded headers, to another host.

A relative URL now resolves against the URL the framework resolved the request under (`event.url` in SvelteKit, `request.url` in Next.js route handlers, TanStack Start and Astro), or against the `host` header where no request URL exists (Next.js `resolveConsent`, `fetchSSRData`). A bare `host` resolves over `https` for a domain name and over `http` for `localhost`, an IP address, or a single-label host such as `app:3000`. The `referer` header is no longer used.

Apps behind a proxy that sets forwarding headers and drops incoming ones can opt back in with `trustForwardedHeaders: true` on SvelteKit `loadConsent` and `resolveConsent`, Next.js `resolveConsent`, `createNextConsentRouteHandlers` and `createPagesApiHandlers`, and `@c15t/react/server` `fetchSSRData` and `normalizeBackendURL`, matching the existing TanStack Start option. The rule lives in `resolveRequestBackendURL` and `resolveRequestOrigin`, new exports of `@c15t/core/server`, which every server adapter now shares. With the option set, the forwarded host and the forwarded scheme apply independently, so a proxy that keeps `host` and only sets `x-forwarded-proto` or `x-forwarded-ssl` still decides the scheme.

The SvelteKit and `@c15t/react/server` helpers also stop passing the client's `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers to the backend, including when `forwardHeaders` names them in SvelteKit. `extractRelevantHeaders` in both packages leaves them out unless called with `{ trustForwardedHeaders: true }`. `fetchSSRData` still makes its `/init` request when those headers are the only ones besides `host`; it just does not forward them.

`resolveBackendURL` from `@c15t/schema/types` is deprecated in favor of `resolveRequestBackendURL`. It now follows the same rule by default: it reads only the `host` header, and ignores `x-forwarded-*` and `referer` unless its new third argument is `{ trustForwardedHeaders: true }`, which restores the previous resolution order. The forwarded values are now validated like `host`: the first entry of a comma-separated list is used, a scheme other than `http` or `https` is ignored, and a host that is not a bare authority resolves to `null`.

### Update documentation links

Point documentation links in CLI prompts and errors, runtime warnings, TSDoc, package READMEs and package homepages at the current c15t.com docs pages. The old addresses led to pages that were moved or removed.

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

### Keep blocking iframes past an unreadable iframe or an empty category

The iframe blocker now skips an iframe the page can't read, not only an unreadable node that contains it. Before, one such iframe made `createIframeBlocker` throw on startup and stopped each later pass early, so other consent-gated iframes loaded. The on-demand watcher in `@c15t/react` had the same gap.

An empty `data-category` is now treated like an unknown category: the iframe stays blocked and logs a console warning. Before, it counted as no category, so the iframe loaded without consent.

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

### Match the DevTools panel to its host theme

Embedded DevTools panels, in Nuxt DevTools and in the TanStack Devtools plugin, now use their own light and dark palette instead of the app's consent theme. The TanStack plugin follows the TanStack Devtools theme. Before this change, a dark TanStack Devtools showed a white c15t panel.

The floating panel no longer mixes the page's consent theme with operating-system colors. Danger and success colors come from the panel's own surface and text, so they stay readable in light and dark themes.

When an embedded panel is at least 48rem wide, it switches to a layout built for a devtools pane instead of stretching the floating card. Consent categories and vendors become tiles. Location, Actions, and Policy details sit in two columns. Scripts show name, source, and status on one row. Events show as a log, with each event's data behind a "Data" toggle. Embedded panels use 14px text on devices without a touchscreen. Narrow panes and the floating panel keep the single-column card, and narrow embedded panes wrap their tabs instead of clipping them.

The panel also has a clearer layout. Each form has one filled primary button. Effective consent, vendor access, and script state show as colored status pills. Clearing stored records now has its own section. On devices without a touchscreen, the floating panel uses the same compact controls as embedded panels.

`c15tDevtools()` now returns a render function, which TanStack Devtools calls with its theme. `C15tTanStackDevtoolsPanel` accepts a `theme` prop of `'light'` or `'dark'`.

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

### Load new copy from `useSetLanguage()` and fix composed banner parts

`useSetLanguage()` now runs init again after storing the language, so the banner and dialog switch to that language without a separate `init()` call. Setting the current language does nothing, and a disabled provider stores the language without running init. With a `runtime` passed to `ConsentProvider`, the runtime reinitializes itself.

The React `offline()` mode, also exported by `@c15t/nextjs` and `@c15t/tanstack-start`, is now core's `offline()`. A language from `useSetLanguage()` or `overrides.language` switches the copy when the bundled translations or `i18n.messages` have that language, and a language with no copy keeps the default copy. The language a server prefetch detected from `Accept-Language` still does not switch the copy, including when `prefetch` is a pending promise.

`ConsentProvider` logs a development warning when `options.callbacks` is passed together with `runtime`. The runtime runs the callbacks its owner passed to `createConsentRuntime({ callbacks })`, and the provider's own callbacks were dropped without notice. The options type for a borrowed runtime now rejects `callbacks`.

Composed banner parts:

- `ConsentBanner.Card` fills a callback ref and keeps its focus trap. Before, a callback ref replaced the ref the trap read, so a blocking card did not trap focus.
- `ConsentBanner.Title` and `ConsentDialog.HeaderTitle` with `asChild` render the child element, such as an `h1`, in place of the `h2`. Before, the child was nested inside the `h2`. `ConsentBanner.Overlay` now honors `asChild` too. `ConsentBanner.Description` and `ConsentDialog.HeaderDescription` with `asChild` and no child element render their default markup instead of nothing.
- `ConsentBanner.AcceptButton`, `RejectButton` and `CustomizeButton` placed by hand now carry `data-action="accept"`, `"reject"` and `"customize"`, as they do in the stock banner, and pick up `theme.consentActions.accept`, `.reject` and `.customize`. An explicit `data-action` or `consentAction` prop still wins.

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

### Inspect consent from a c15t tab in Nuxt DevTools

In development, the Nuxt module adds a c15t tab to Nuxt DevTools. The tab shows the DevTools panels for the app's consent kernel, including events and consent actions, and follows the DevTools light or dark theme. Production builds don't register the tab. Set `devtools: false` in the module options to turn it off.

`c15t/vue/devtools` and `@c15t/vue/devtools` now export `ConsentDevToolsPanel`, which fills its parent element instead of floating over the page. `createDevTools` accepts `embedded: true` for the same layout, and can render into a same-origin iframe while it inspects the page that owns the kernel.

Embedded panels, including the TanStack Devtools plugin from `c15t/react/devtools`, no longer show their own c15t header, because the host already names the panel.

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

### Pass `shadow` from `ConsentDevTools` to the DevTools panel

`ConsentDevTools` in `@c15t/svelte`, `@c15t/react` and `@c15t/vue` accepted
`shadow` in its props type but never passed it to `createDevTools`, so the
panel always mounted inside a shadow root. The Vue component did not
declare the prop at all. `shadow={false}` now mounts the panel in the light
DOM, with its stylesheet in `<head>`, as the `@c15t/dev-tools` option
describes. Leaving `shadow` out keeps the shadow root.

### Pass `colorScheme` through `generateThemeCSS` from `@c15t/react/utils`

`generateThemeCSS(theme, colorScheme)` from `@c15t/react/utils` now takes the same `colorScheme` argument as the one in `@c15t/ui/theme` and writes the same CSS. It used to drop the argument, so `'dark'` and `'system'` produced light-only CSS.

### Stop the floating trigger's transitions when `disableAnimation` is set

The floating dialog trigger and the trigger toolbar now carry `data-disable-animation` when the provider's `disableAnimation` is on, and the stylesheet then drops their hover and snap-to-corner transitions. They already stop under `prefers-reduced-motion: reduce`.

## @c15t/react@3.0.0-alpha.3 (alpha)

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

### Load the iframe blocker when a gated iframe is on the page

`ConsentProvider`, and `ConsentRoot` through it, downloaded and started the iframe blocker on every page, including pages without an iframe to gate. It now loads when the first iframe with `data-category` or `data-vendor` is on the page. Until it runs, such an iframe that arrives with a `src` consent does not allow is paused the way the blocker pauses it. In a Next.js 16 production build of the App Router setup with no gated iframes, first-load JavaScript drops by 3,681 bytes (1,572 bytes gzip) and one request. `iframeBlocker: { disableAutomaticBlocking: true }` and `useIframeBlocker()` load the blocker at mount as before.

### Follow a replacement runtime in `ConsentProvider`

When you pass `ConsentProvider` a different `runtime`, the provider now
switches to it. Hooks and `KernelContext` consumers unsubscribe from the
previous runtime's kernel and read the new one. Previously the provider kept
rendering the first runtime it received, so consumers could show that
runtime's consent after you replaced it. The provider still leaves both
runtimes to their owner and disposes neither.

An open preference UI switches too. `ConsentDraftProvider`,
`useConsentDraft()` and `useVendorDraft()` discard the draft staged against
the previous runtime and start a new one from the new runtime's record, so a
save only records into the new runtime. A draft inherited from an outer
`ConsentDraftProvider` is only shared while both providers use the same
runtime, so a nested provider on another runtime keeps its own. A draft
handle kept from before the switch, for example by an async submit, no longer
saves: `save()` resolves `{ ok: false }`, its setters do nothing, and it
records into neither runtime. This applies from the moment the switch
commits, including in a layout effect of that commit, and to a handle taken
from an outer draft. A handle kept after the preference UI unmounts, with no
switch, still saves.

`IABProvider` stops exposing the previous runtime's handle. An IAB action
taken right after the switch waits for the new runtime's handle, including
when you switch back to a runtime the provider rendered before. An action
still addressed to the previous runtime rejects with an `AbortError` and is
not applied to either runtime. That includes actions on a `useIAB()` result
kept from before the switch, under `IABProvider` or a borrowed runtime's
`ConsentProvider`, from the moment the switch commits: its `save()` rejects
and its setters do nothing.
Actions still waiting when `IABProvider` unmounts, for example because its
CMP failed to start, also reject with an `AbortError` instead of never
settling. Moving between a borrowed runtime and one the provider creates
still requires a remount.

### Keep the dialog-trigger icons out of the banner's first load

The fingerprint and settings icons of `ConsentDialogTrigger` shared a module with the branding logos the banner renders, so every page that showed the banner downloaded them. They now live next to the trigger and load with it. A Next.js App Router page with the banner ships about 530 fewer gzipped bytes of JavaScript on first load.

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and reload the page when the source withdraws a granted category, using the existing `reloadOnConsentRevoked` option and `onBeforeConsentRevocationReload` callback. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

Keep disabled runtimes permissive when an external source is configured. Complete browser readiness after connecting the source, keep Astro preference triggers available, and reject IAB saves owned by an external CMP. External permissions disable c15t IAB authority. Deliver events for built-in Umami, Rybbit and Matomo integrations, and preserve custom GTM queue names during initialization and dispatch.

Report external CMP subscription failures without aborting provider startup. Keep optional permissions denied and ignore notifications from the failed connection.

### Load the consent dialog before it opens

The deferred `<ConsentDialog />` now starts loading earlier, so the first open doesn't wait for its download.

- Every button that opens the dialog loads it on hover or focus: the stock `<ConsentBanner />` Customize button, `ConsentDialogLink`, `ConsentDialogTrigger`, and the `ConsentGate` button. Before, only `ConsentBanner.PolicyActions` did this. Handlers you pass as `onFocus` or `onPointerEnter` still run.
- While the banner is shown or one of those buttons is mounted, the dialog also loads in the browser's first idle period after the page's `load` event. That covers a tap or keyboard open with no hover or focus first. It's skipped with Save-Data on, on 2G connections, and offline. A visit with saved consent and nothing that opens the dialog doesn't download it.
- Set `preloadDialog: 'intent'` in the provider options to load only on hover, focus or open.
- A preload that fails, for example offline, no longer breaks the dialog. The next hover, focus or open retries the download.

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

### Keep blocking iframes when one node on the page is bad

The iframe blocker could let consent-gated iframes load after it hit a node the page can't read, such as one Firefox reports as "Permission denied to access property". It skipped every iframe in that `MutationObserver` batch, including ones added before the bad node. The on-demand watcher in `@c15t/react` had the same gap. Both now skip the unreadable node and gate the rest.

An iframe with an invalid `data-category` no longer throws. Before, one such iframe stopped the blocker from starting and made every later pass stop early, so revoking consent left other gated iframes loaded. It now stays blocked and logs a console warning, the same way the on-demand watcher already held it.

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

### `useNetworkBlocker` holds matching requests from its first render

The standalone `useNetworkBlocker` hook installed the blocker from a mount effect. Effects in the calling component's children, and in components rendered before it, run first, so matching `fetch` and XHR requests sent from them went out without a consent check on first visits and for visitors who had rejected. The hook now holds matching requests from the first render of the component that calls it, the same way the provider's `networkBlocker` option does since the previous release, and the blocker decides them once it loads.

Holds are now tracked per caller. When a page uses both the provider option and the hook, one blocker loading or one component unmounting no longer releases requests that the other's rules still hold. A blocker configured with `enabled: false` holds nothing and no longer sends requests another caller holds. `createConsentRuntime()` (which the Svelte, Astro and browser packages use) and the Vue plugin follow the same rules, and a runtime or Vue context disposed before it starts ends only its own hold. The requests it held are answered as blocked (a 451 response for `fetch`, a failed XHR) rather than sent, since nothing checked consent for them.

### Migration

The hook's first render in the browser now has a side effect: it patches `fetch` and `XMLHttpRequest` to hold requests that match its rules. On the server it still does nothing. If React discards that render and never commits it (a render that throws, or an attempt thrown away while suspending), the hold ends after 10 seconds and the requests it held fail as blocked (a 451 response for `fetch`, a failed XHR), since nothing checked consent for them. The same applies when the hook's component, or the provider, unmounts before its blocker loads. No code changes are needed. If a test asserts that `window.fetch` is untouched after rendering a component that calls the hook, update it: during the first render `window.fetch` is the hold's wrapper, and after the blocker loads it is the blocker's.

### Defer the dialog and widget on their split entries

**Breaking.** `@c15t/react/consent-dialog` and `c15t/react/consent-dialog` now export the deferred `ConsentDialog`, the same component as the `@c15t/react` root. The dialog's code loads when it first opens, so importing the split entry no longer puts the dialog in every page's first load. Before, this entry exported the dialog itself. In a Next.js production build of a provider, banner, dialog and link imported from split entries, the change takes 4,411 B gzip of JavaScript out of what the page requests before its `load` event.

`@c15t/react/consent-widget` and `c15t/react/consent-widget` likewise export the deferred `ConsentWidget` from the root entry.

Both entries now export only the component and its prop and compound types. The individual parts they also exported, such as `Card`, `Header`, `Overlay`, `ConsentDialogRoot`, `Accordion`, `Switch` and `Footer`, are no longer exported from them.

### Migration

- `<ConsentDialog />` and `<ConsentWidget />` from the split entries need no change. `ConsentDialog.Card` and the other `ConsentDialog.<Part>` properties still work and load with the dialog's chunk.
- If you imported a part by name, import it from the component entry instead:

  ```ts
  // Before
  import { Card, Header } from 'c15t/react/consent-dialog';
  // After
  import { Card, Header } from 'c15t/react/components/consent-dialog';
  ```

- To keep the dialog in the first load, import `ConsentDialog` from `c15t/react/components/consent-dialog` (or `@c15t/react/components/consent-dialog`). The first open then needs no download, and every visitor downloads the dialog.

### Reload the page when a visitor revokes consent

Revoking consent removed a vendor's script element but left its code running. Listeners, timers, history hooks and chat widgets kept working until the next full page load. v2 reloaded the page on revocation, and v3 lost that behaviour when the consent policy contracts were unified.

When an accept, reject or save turns off a category or vendor that was granted, the page now reloads after every in-flight save request settles, so the next page runs only permitted code. `onBeforeConsentRevocationReload` runs just before the reload. A first visit that rejects under opt-in does not reload, because nothing gated had run. Rejecting defaults under opt-out does, because gated code ran before the choice. Expiry, policy changes and privacy signals do not reload.

Set `reloadOnConsentRevoked: false` to turn this off. The option is available on `ConsentProvider`, `ConsentRoot` `options`, `createConsentRuntime()`, the Vue plugin config, the browser client, and the Astro integration. `@c15t/svelte` receives it through its runtime options.

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

### Stop exposing the kernel on `window.c15tKernel`

`ConsentProvider` no longer sets `window.c15tKernel`. Nothing in c15t has read it since DevTools started taking the kernel directly, and the global kept the whole kernel reachable from any script on the page, including after the provider unmounted. `window.c15t` still carries the debug information. Pages that use the React provider ship 54 bytes less JavaScript after gzip.

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

### Keep policy pack resolution out of client bundles

The React provider and the core runtime resolved their disabled-mode policy with `resolvePolicyRules` when they loaded, so every page validated a rule and computed three SHA-256 fingerprints on startup, and every client bundle carried the policy validator and the hashing code. The kernel's policy wire reader also shared a module with `resolvePolicyRules`, which pulled in the same code. The disabled resolution is now a constant, pinned by a test to what the resolver returns, and `@c15t/schema/types` exports the wire reader and resolved-rule checks from their own modules. In a Next.js 16 production build of the App Router setup, first-load JavaScript drops by 17,665 bytes (5,313 bytes gzip). Every public export keeps its name and behavior.

### Block network requests sent before the network blocker loads

The network blocker loaded after mount, so a `fetch` or XHR that matched a rule and was sent from a child component's mount effect, from an effect next to the provider, or from a client module evaluated inside it went out without a consent check. This happened on first visits, for visitors who had rejected, and when the policy request failed or hung. `ConsentProvider` and `ConsentRoot` now hold matching requests from their first render in the browser, and the blocker decides them once it loads. Vue holds them from plugin install until the root mounts. `createConsentRuntime()`, which `@c15t/svelte` and the `c15t` browser client use, holds them from construction until `start()`. A provider that unmounts before its blocker loads, a runtime disposed before `start()`, or a Vue context disposed before its root mounts answers the requests it held as blocked (a 451 response for `fetch`, a failed XHR) rather than sending them, since nothing checked consent for them. Requests another caller still holds keep waiting.

While consent is unknown, a matching request that would be blocked now waits instead of failing. It is sent if the resolved policy and the visitor's stored choice allow it, and blocked if they do not or if the policy fails to load. Requests that match no rule are not delayed. Apps without `networkBlocker` still do not download the blocker; the hold adds about 0.8 KB gzip to first-load JavaScript.

Requests made before the provider renders are still out of reach, including inline scripts, tags loaded before hydration, and client modules that webpack evaluates when a route's chunk loads. The new network blocker pages for Next.js and React describe these limits and how to keep tracking calls out of that window.

## @c15t/react@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

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

### Remove dialog scheduling delays and preserve IAB actions

Remove first-open scheduling delays from React's aggregate dialog, widget, and compound components while preserving server rendering and hydration. Keep children mounted when an external runtime provides IAB context, so loading the bridge cannot reset local drafts.

Remove the extra Suspense delay from Astro's React IAB dialog island.

Queue external-runtime IAB actions until the runtime publishes its handle, and reject pending saves with AbortError when the borrowing provider unmounts. Correct the React and Next.js peer dependency ranges to require React and React DOM 18 or newer, matching the APIs already used by v3. Upgrade both React packages before using v3 on an older installation.

# @c15t/react

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

## 2.2.0-canary-20260731105620

### Patch Changes

- c187c9d: Add a `nonce` option for nonce-based Content Security Policies

  The injected `<style id="c15t-theme">` element previously carried no nonce, so a strict CSP blocked it unless you allowed `'unsafe-inline'`. Setting `nonce` on the provider options now applies it to that stylesheet and to every `<script>` element created by the script loader. A per-script `nonce` still takes precedence.

  ```tsx
  <ConsentManagerProvider options={{ mode: "offline", nonce }}>
    {children}
  </ConsentManagerProvider>
  ```

- Updated dependencies [c187c9d]
  - @c15t/ui@2.2.0-canary-20260731105620
  - c15t@2.2.0-canary-20260731105620

## 2.2.0-canary-20260727202135

### Minor Changes

- b032a69: Add `ConsentDialogTriggerToolbar` to React and Next.js as an opt-in, draggable toolbar with app-owned actions and exactly one built-in consent preferences action. The existing `ConsentDialogTrigger` remains unchanged.
- ace6760: Add a policy-aware `consentActions.primary` theme key. It styles whichever action(s) the active policy marks as primary (`ui.banner.primaryActions`), so the policy decides which action is primary while the theme decides how a primary action looks. Resolution order: explicit props → per-action keys (`accept`/`reject`/`customize`) → `primary` → `default` → fallback.

  The IAB consent banner previously hardcoded its button variants, bypassing `consentActions`; it now resolves button treatments through the same logic, keeping its stock styling as the fallback.

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
- c7e53ff: Forward `x-c15t-version` on backend-bound requests from browser, SSR, prefetch, and Node SDK clients, and allow the header through backend CORS preflight handling.
- Updated dependencies [b032a69]
- Updated dependencies [16a1f82]
- Updated dependencies [ace6760]
- Updated dependencies [c7e53ff]
- Updated dependencies [ace6760]
- Updated dependencies [e4315bd]
- Updated dependencies [ace6760]
- Updated dependencies [5406a8d]
- Updated dependencies [ca7784f]
- Updated dependencies [30cb116]
  - @c15t/ui@2.2.0-canary-20260727202135
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

- Updated dependencies [4a89092]
  - c15t@2.1.0
  - @c15t/ui@2.1.0

## 2.0.4

### Patch Changes

- Updated dependencies [748536a]
  - c15t@2.0.4
  - @c15t/ui@2.0.3

## 2.0.3

### Patch Changes

- 10cec50: Fix consent widget footer slot styling so container classes no longer leak onto nested footer subgroups.
- Updated dependencies [10cec50]
  - @c15t/ui@2.0.2

## 2.0.2

### Patch Changes

- 50e17f0: Allow `ConsentDialog.Overlay` to accept direct `className`, ref, and div props for headless `noStyle` usage, matching the banner overlay API.
- 50e17f0: Fix Tailwind CSS v3 stylesheet packaging so package resolvers that do not follow nested CSS imports still include the generated c15t component rules.

  Root `styles.tw3.css` and `iab/styles.tw3.css` proxy entrypoints are now published, and the React/Next.js Tailwind v3 dist stylesheets inline the generated UI CSS instead of forwarding through nested package imports.

- Updated dependencies [50e17f0]
  - @c15t/ui@2.0.1

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - c15t@2.0.0
  - @c15t/ui@2.0.0

## 2.0.0-rc.12

### Patch Changes

- aa2bb42: Fix consent switch sizing so it renders consistently in Tailwind and non-Tailwind apps.

  - `@c15t/ui`: make the shared switch primitive use an explicit `border-box` layout, size its track independently of host box-model resets, and clip the track so the thumb ring does not bleed past the edge.
  - `@c15t/react`: publish the updated prebuilt consent UI styling so React consumers pick up the normalized switch sizing.
  - `@c15t/nextjs`: publish the updated stylesheet bridge so Next.js installs pick up the normalized switch sizing as well.

- Updated dependencies [aa2bb42]
  - @c15t/ui@2.0.0-rc.11

## 2.0.0-rc.10

### Minor Changes

- 79ae8cf: Remove the legacy stock-branding theme keys and require the new explicit tag slots for prebuilt consent surfaces.

  - `@c15t/react`: stop resolving stock banner/dialog/widget/IAB branding tags through legacy footer-branding aliases and render the standalone widget/dialog tags without the old footer-wrapper compatibility path.
  - `@c15t/ui`: add explicit branding tag slots for each prebuilt surface: `consentBannerTag`, `consentDialogTag`, `consentWidgetTag`, `iabConsentBannerTag`, and `iabConsentDialogTag`.

  Breaking change:

  - `consentWidgetBranding` has been removed. Use `consentWidgetTag`.
  - `consentDialogFooter` no longer styles the stock dialog branding tag. Use `consentDialogTag`.
  - Style stock banner and IAB branding tags via the new explicit tag slots instead of footer-related keys.

### Patch Changes

- 64d6009: Replace the shared `clsx` dependency with a local `cn` implementation owned by `@c15t/ui`.

  - `@c15t/ui`: own the public `ClassValue` type and `cn(...)` implementation directly instead of re-exporting them from `clsx`, with coverage for nested arrays, object maps, numeric values, and ordering.
  - `@c15t/react`: continue consuming the shared `@c15t/ui` class helper while dropping the now-unused direct `clsx` dependency from the published package.
  - `@c15t/dev-tools`: remove the unused direct `clsx` dependency from the published package manifest.

- Updated dependencies [64d6009]
- Updated dependencies [7576dc1]
- Updated dependencies [79ae8cf]
- Updated dependencies [9579b62]
  - @c15t/ui@2.0.0-rc.10
  - c15t@2.0.0-rc.10

## 2.0.0-rc.9

### Patch Changes

- 59b850b: Harden the prebuilt consent-surface branding against host-page CSS so the INTH and c15t wordmarks stay correctly sized across docs, marketing sites, and other embedded app shells.

  - `@c15t/react`: wrap both prebuilt full-logo branding paths in shared internal wordmark containers instead of attaching sizing classes directly to the raw `svg` elements.
  - `@c15t/ui`: move the logo constraints onto the internal branding wrappers and nested `svg` elements, adding explicit flex, max-width, block-layout, and aspect-ratio rules so global host-page `svg` styles cannot blow up or collapse either wordmark.
  - `@c15t/nextjs`: keep the published styled surface behavior aligned with the hardened React/UI branding path used by the prebuilt consent banner and dialog components.

- Updated dependencies [59b850b]
  - @c15t/ui@2.0.0-rc.9

## 2.0.0-rc.8

### Minor Changes

- 3d4c107: feat(consent): add change-only consent callbacks

  - add `onConsentChanged` as a dedicated callback for explicit consent saves that change an existing persisted consent state
  - include both previous and current consent categories in the callback payload so analytics and integrations can diff grant/revoke transitions directly
  - keep `onConsentSet` focused on broad consent-state updates, including initialization and auto-grant flows
  - update the React provider to keep callback registrations in sync when callback props change after mount

### Patch Changes

- 5956531: Simplify the 2.0 static prefetch flow so static routes only need to start `/init` early and matching prefetched data is consumed automatically during first store initialization.

  - `c15t`: add canonical request-context metadata for SSR and browser-prefetch payloads, auto-consume matching prefetched data on first runtime/store initialization, and replace blanket SSR skip-on-overrides behavior with exact request-context matching.
  - `@c15t/react`: preserve the dynamic SSR `fetchInitialData()` flow while exposing the new `context_mismatch` SSR status behavior for matching overrides, backend URLs, credentials, and ambient GPC.
  - `@c15t/nextjs`: remove the RC-era public static-prefetch consumer APIs from the package surface and document `C15tPrefetch` as the only static-route setup step.
  - `@c15t/cli`: update generated static-route templates to rely on automatic prefetch consumption instead of wiring manual prefetch lookups.

- 918a70e: Fix published TypeScript declaration packaging so consumers stay compatible across both TypeScript 5 and TypeScript 6.

  - `@c15t/react`: correct the `./primitives` type export entries so they point at the published `dist-types` files instead of missing declaration paths.
  - `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/logger`, `@c15t/node-sdk`, and `@c15t/scripts`: normalize emitted `dist-types` imports during builds so published declarations no longer reference sibling `.d.ts` files directly, which could break consumers on newer TypeScript versions.
  - Tooling: make declaration normalization discover package targets dynamically so the compatibility fix applies consistently across published packages instead of only a hardcoded subset.

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
- Updated dependencies [cd9c830]
- Updated dependencies [fee82fd]
  - c15t@2.0.0-rc.8
  - @c15t/ui@2.0.0-rc.8

## 2.0.0-rc.7

### Patch Changes

- ec30bd1: feat(primitives): shared UI primitive runtime, framework adapters, and runtime performance

  - Extract seven framework-agnostic primitives into `@c15t/ui/primitives`: accordion, button, collapsible, dialog, switch, tabs, and preference-item
  - Add `PreferenceItem` compound component that unifies three separate expandable-row patterns (Radix Accordion, custom button + AnimatedCollapse, manual state) into a single composable primitive with semantic slots
  - Publish framework adapter packages (`@c15t/solid`, `@c15t/vue`, `@c15t/svelte`) re-exporting shared primitives and CSS variant generators
  - Add cross-framework storybooks with shared play-function interaction tests and CI test-runner integration

  **Mobile viewport fixes:**

  - Add `box-sizing: border-box` to all fixed-position consent roots (banner, dialog, IAB variants) — prevents horizontal overflow on narrow viewports
  - Constrain dialog card with `max-height: 100%` and scrollable content area — prevents title/description from being pushed off-screen on small devices

  **Runtime performance (react-browser-bench, full-ui scenario):**

  - Memoize `useTheme()` deep merge with `useMemo` — reduces calls from 35 to 23 (-35%), total time from 0.10 ms to 0.02 ms (-80%)
  - Replace `offsetWidth`/`offsetHeight` visibility checks in focus trap with `checkVisibility()` API — eliminates forced synchronous layout on every Tab keypress
  - Both optimizations are in `@c15t/ui` and benefit all frameworks equally

- Updated dependencies [ec30bd1]
  - @c15t/ui@2.0.0-rc.7

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

- 1a724fc: fix(policy-packs): support multiple primary actions while keeping customize as the default primary action

  Expose `primaryActions` consistently across schema, backend, core, React, and dev-tools. Built-in preset and offline default policies keep `customize` as the default primary action, while custom policies can now mark multiple actions as primary.

- Updated dependencies [e08e52c]
- Updated dependencies [5c8ee05]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6
  - @c15t/ui@2.0.0-rc.6

## 2.0.0-rc.5

### Patch Changes

- 021ac99: Bundle version-matched docs inside published c15t packages under `docs/**` for local agent and developer reference.

  Remove CLI `AGENTS.md` generation. Use the bundled package docs directly alongside c15t agent skills.

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

- Updated dependencies [021ac99]
- Updated dependencies [5f30a3b]
- Updated dependencies [58fb392]
- Updated dependencies [e79f840]
- Updated dependencies [58fb392]
- Updated dependencies [60a51f1]
- Updated dependencies [372cf92]
  - c15t@2.0.0-rc.5
  - @c15t/ui@2.0.0-rc.5

## Unreleased

- Bundle version-matched docs in the published package under `docs/**` for local developer and agent reference.

## 2.0.0-rc.4

### Patch Changes

- 0a42b31: feat(react): ConsentDialogLink component
- Updated dependencies [29819bc]
  - c15t@2.0.0-rc.4
  - @c15t/ui@2.0.0-rc.4

## 2.0.0-rc.3

### Patch Changes

- de6dd82: fix(ui): dark mode not being applied
- 0f10f3e: fix(react): react compiler compatability
- Updated dependencies [de6dd82]
- Updated dependencies [1c813bc]
- Updated dependencies [0f10f3e]
  - @c15t/ui@2.0.0-rc.3
  - c15t@2.0.0-rc.3

## 2.0.0-rc.2

### Patch Changes

- 408df0e: feat: CMP ID now comes from backend, either inth.com when hosted or BYO CMP ID
  feat: Center the IAB Banner for better policy compliance
  feat: Improve doc comments around IAB
- e6bc5db: fix: update import paths from .css to .js for component styles
- 684bf2a: fix(ui): dialog width customization, disableAnimation preventing dialog from showing
- Updated dependencies [408df0e]
- Updated dependencies [e6bc5db]
- Updated dependencies [684bf2a]
  - c15t@2.0.0-rc.2
  - @c15t/ui@2.0.0-rc.2

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving
- Updated dependencies [0bc4f86]
  - c15t@2.0.0-rc.1
  - @c15t/ui@2.0.0-rc.1

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2.0.0-rc.0

### Patch Changes

- Updated dependencies [126a78b]
  - c15t@2.0.0-rc.0
  - @c15t/ui@2.0.0-rc.0

## 1.8.3

### Patch Changes

- 6c28663: Full Changelog: https://c15t.com/changelog/1.8.3
- Updated dependencies [6c28663]
  - c15t@1.8.3

## 1.8.3-canary-20260109181827

### Patch Changes

- Updated dependencies [486c46f]
  - c15t@1.8.3-canary-20260109181827

## 1.8.3-canary-20251222100111

### Patch Changes

- Updated dependencies [3d8eb68]
  - c15t@1.8.3-canary-20251222100111

## 1.8.3-canary-20251218133143

### Patch Changes

- 226f45c: fix(react): custom styling support for dialog and accordion
- Updated dependencies [9eff7a7]
- Updated dependencies [b7fafe6]
  - c15t@1.8.3-canary-20251218133143

## 1.8.2

### Patch Changes

- 2ce4d5a: \* feat(core): Added ability to disable c15t with the `enabled` prop. c15t will grant all consents by default when disabled as well as loading all scripts by default. Useful for when you want to disable consent handling but still allow the integration code to be in place.

  - fix(react): Frame component CSS overriding
  - fix(react): Legal links using the asChild slot causing multi-child error

  https://c15t.com/changelog/1.8.2

- Updated dependencies [2ce4d5a]
  - c15t@1.8.2

## 1.8.2-canary-20251212163241

### Patch Changes

- Updated dependencies [a368512]
  - c15t@1.8.2-canary-20251212163241

## 1.8.2-canary-20251212112113

### Patch Changes

- 7284b23: feat(core): add ability to disable c15t
- dfd5e4f: fix(react): frame css overiding
- Updated dependencies [7284b23]
  - c15t@1.8.2-canary-20251212112113

## 1.8.2-canary-20251210222051

### Patch Changes

- a03d607: fix(react): legal links using the asChild slot causing multi-child error

## 1.8.2-canary-20251210105424

### Patch Changes

- 3eb3f4a: fix(react): hydration error when wrapped in an SSR component

## 1.8.1

### Patch Changes

- Updated dependencies [0f55bf2]
  - c15t@1.8.1

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/1.8.0

### Patch Changes

- Updated dependencies [68a7324]
  - c15t@1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 7043a2e: feat: add configurable legal links to consent banner and consent dialog
- bee7789: feat(core): identify users before & after consent is set
  feat(backend): add endpoint to identify subject with consent ID
  refactor(core): improved structure of client API & removed unused options
- 69d6680: feat: country, region & language overrides

### Patch Changes

- 31953f4: refactor: improve package exports ensuring React has same exports as core
- 6e3034c: refactor: update rslib to latest version
- Updated dependencies [31953f4]
- Updated dependencies [7043a2e]
- Updated dependencies [6e3034c]
- Updated dependencies [bee7789]
- Updated dependencies [b3df4d0]
- Updated dependencies [69d6680]
  - c15t@1.8.0-canary-20251112105612

## 1.8.0-canary-20251028143243

### Minor Changes

- a0fab48: feat(core): cookie/local-storage hybrid approach

### Patch Changes

- 067c7af: fix(react): frame component hydration error
- Updated dependencies [8f3f146]
- Updated dependencies [a0fab48]
  - c15t@1.8.0-canary-20251028143243

## 1.7.0

### Minor Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/1.7.0

### Patch Changes

- Updated dependencies [aa16d03]
  - c15t@1.7.0

## 1.7.0-canary-20251014174050

### Patch Changes

- 87ce89f: fix(react): missing use-client causing build errors in Next.js 14

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

### Patch Changes

- Updated dependencies [0c80bed]
- Updated dependencies [a58909c]
  - c15t@1.7.0-canary-20251012181938

## 1.6.1

### Patch Changes

- 6257a20: fix(react): dialog scroll lock persisting after closure

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/1.6.0).

### Patch Changes

- Updated dependencies [84ab0c7]
  - c15t@1.6.0

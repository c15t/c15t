## c15t@3.0.0-alpha.4 (alpha)

### Resolve Nuxt visitors in the browser on prerendered and cached routes

Nuxt pages that are prerendered, or cached by a `cache`, `swr`, `isr` or `prerender` route rule, no longer carry the consent records, location and request headers of the render that produced them. That HTML is served to every visitor, so it now renders without the banner, and the browser requests the visitor's policy and reads their stored choice after hydration. Before, the browser reused the build-time or first visitor's result and skipped its own policy request, and a visitor who rejected saw the banner again after a reload.

In the browser, a newer denial kept in localStorage now also applies on top of the records the server read from the request cookie, instead of being overwritten by them.

### Export the Astro dialog stylesheets

With `styles: false`, import the preference dialog's rules from `@c15t/astro/dialog.css` (`c15t/astro/dialog.css` in the umbrella package). The Svelte dialog also needs `@c15t/astro/primitives.css` (`c15t/astro/primitives.css`). You no longer need to install `@c15t/ui` to import `@c15t/ui/styles/dialog.css` and `@c15t/ui/styles/primitives.css`.

```css
@import 'c15t/astro/styles.css';
@import 'c15t/astro/dialog.css';
@import 'c15t/astro/primitives.css';
```

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

### One tenant setting, refused when it is unsafe, and recovery for visitors whose subject ID another tenant holds

A self-hosted backend now names its tenant in one place: the instance's `tenantId`. `manifest.tenantId` is removed from the backend configuration. It never scoped a database query, but it did scope policy snapshot tokens when the instance had no `tenantId`, so a config that set only that one issued tokens for a tenant while writing every consent with a null tenant. Built manifests no longer carry it. `ConsentManifest.tenantId` stays on the wire type for other manifest producers.

`c15tInstance` and `createApp` check the tenant when the instance is built. They throw when `tenantId` is empty, padded with whitespace or not a string (a `null` from a JavaScript config used to scope every query to `tenantId = NULL`, which matches nothing), and when the config still sets `manifest.tenantId`, rather than ignoring it. The new `requireTenantId: true` option makes a missing `tenantId` throw too. Set it on every instance that shares a database with other tenants. Without it, an instance whose tenant lookup returned `undefined` starts in the single-tenant scope and writes consents with a null tenant, which the tenant that owns them never reads.

Subject IDs are chosen by the browser and are unique across the whole database. A save naming a subject ID that another tenant holds was answered `400 CONFLICT`, on every save, with no way for the visitor to recover. It is now `409 SUBJECT_CONFLICT`. `@c15t/core` responds by giving the visitor a new subject ID, moving any queued saves to it, and sending the choice once more. Every open tab moves to the same new ID. A consent recorded again with different receipts, purposes or vendor grants is now `409 CONFLICT` instead of `400`. The hosted and manifest transports treat both as permanent refusals, so the kernel no longer replays them from its queue.

### Migration

- Remove `tenantId` from the backend's `manifest` block and set it on the instance. If the instance already sets the same value, delete the manifest one. If it set only `manifest.tenantId`, the instance has been writing rows with a null tenant: setting `tenantId` scopes it to that tenant, and those rows stop appearing in its reads.
- Code that matched `400` with `cause.code: 'CONFLICT'` from `POST /subjects` should expect `409`, and `SUBJECT_CONFLICT` for a subject ID held by another tenant. `PUT /legal-documents` conflicts are still `400 CONFLICT`.
- A manifest built from a config that set `tenantId` gets a new `revision`, so cached manifests refresh once.

### Accept `colorScheme: null` in Astro

The integration's `colorScheme` accepts `null` with the same meaning as `'none'`: c15t neither sets nor clears `c15t-dark` on `<html>`. `null` is the value the React, Vue and Svelte providers use for this, so a shared config works in all of them. The default stays `'system'`.

### Type `nonce`, `iframeBlocker`, `storageConfig`, `domain` and `app.config.ts` for Nuxt

The Nuxt module options now accept `nonce`, `iframeBlocker`, `storageConfig` and `domain`, which the runtime already read. The `c15t` key of `app.config.ts` is now typed, including when the module is registered as `c15t/vue`, and accepts `networkBlocker.onRequestBlocked`. Module options pass through JSON and cannot hold that callback, so set it in `app.config.ts`.

### Index experiment attribution and summarise choices per arm

Summarise banner experiments from the backend. Migration `6-experiment-attribution` adds `experimentId`, `experimentArm` and `timeToDecisionMs` columns to `consent`, indexed on `(tenantId, experimentId, experimentArm)`, and `POST /subjects` fills them from `metadata.experiment` and `metadata.timeToDecisionMs` while leaving `metadata` untouched. Values over 128 characters or malformed are dropped rather than failing the save. `GET /experiments/:id/summary` (API key) returns `arms: [{ arm, choices, byAction, bySurface, medianTimeToDecisionMs }]`, choices per arm split by stored `consentAction` (`byAction` always carries `accept_all`, `reject_all`, `opt_out`, `custom` and `unknown`) and `uiSource`, with the median time to decision, filtered by `from`, `to` and `domain`; the response is validated against the new `experimentSummaryOutputSchema` in `@c15t/schema`, and `@c15t/node-sdk` exposes it as `client.experiments.summary(id, { from, to, domain })`. The summary counts choices; the visitors each arm was owed to arrive on the session reports `/init` produces, so an opt-in rate divides the two.

### Add `disableAnimation` to Astro

The integration accepts `disableAnimation`. It skips the banner's entry animation, in the server markup and in a banner the browser renders, and the dialog islands' enter and exit animations. `<ConsentBanner />`, `<IABConsentBanner />`, `<ConsentDialog />` and `<IABConsentDialog />` take the same prop to override it for one surface.

```astro
<ConsentBanner disableAnimation />
```

Left unset, animations play, and the stylesheet stops them for visitors who ask for reduced motion, as before.

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

### Inspect consent from a c15t tab in Nuxt DevTools

In development, the Nuxt module adds a c15t tab to Nuxt DevTools. The tab shows the DevTools panels for the app's consent kernel, including events and consent actions, and follows the DevTools light or dark theme. Production builds don't register the tab. Set `devtools: false` in the module options to turn it off.

`c15t/vue/devtools` and `@c15t/vue/devtools` now export `ConsentDevToolsPanel`, which fills its parent element instead of floating over the page. `createDevTools` accepts `embedded: true` for the same layout, and can render into a same-origin iframe while it inspects the page that owns the kernel.

Embedded panels, including the TanStack Devtools plugin from `c15t/react/devtools`, no longer show their own c15t header, because the host already names the panel.

### Load only the dialog link from its subpath

`@c15t/nextjs/components/consent-dialog-link`, `@c15t/tanstack-start/components/consent-dialog-link` and their `c15t/next` and `c15t/tanstack-start` equivalents now export only `ConsentDialogLink`. They pointed at the whole adapter entry, so importing the link pulled in the rest of the adapter.

### Resolve unknown locations on static pages with the manifest's own policy

`createStaticConsentResolver` from `@c15t/tanstack-start/static` now starts a visitor with no known location on the manifest's unknown-location policy (its `fallback` pack, else its `default` pack), as `@c15t/nextjs/static` already did and as server rendering does when location headers are missing. It previously picked the strictest pack in the manifest and applied it to everyone, including packs scoped to other countries. A manifest with no fallback or default pack now resolves to a failed `insufficient-inputs` result, and the client applies its safe fallback.

Geo data that isn't a non-empty string, such as a numeric `country` or a blank `regionCode` from the geo endpoint, now counts as an unknown location. It previously reached the policy resolver and could end up in `location.countryCode`. String values are trimmed.

The static resolver now lives in `@c15t/core/static` (also available as `c15t/static`), and both framework `static` entries re-export it. `resolveStrictestDefaultInit` is renamed to `resolveUnknownLocationInit`. The old name still works in `@c15t/nextjs/static` and `@c15t/tanstack-start/static` and is marked deprecated.

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

### An undeclared vendor reads as not allowed

Breaking change: reading vendor consent for an id that no `vendors` entry, script slug or backend vendor list declares now returns `false`. Before, React's `useVendorAllowed`, Astro's `client.isVendorAllowed` and `@c15t/browser`'s `isVendorAllowed` returned `true` for such an id without checking any category, so a typo or a missing declaration read as allowed before the visitor consented. In development, c15t logs one warning per undeclared id that names the missing declaration. Declare every vendor you read, for example `vendors: [{ id: 'youtube', category: 'measurement', ... }]`.

The rule lives in one helper, `isVendorAllowed(snapshot, vendorId, now?)`, exported from `c15t` and `@c15t/core`. A declared vendor keeps its behaviour: it is allowed when its category condition passes and, outside an IAB policy, the visitor has not switched it off.

Vue gains `useVendorAllowed(vendorId)`, which returns a computed boolean and is auto-imported in Nuxt. The Svelte consent manager from `getConsentManager()` gains `isVendorAllowed(vendorId)`.

Scripts, iframes and network rules that carry an undeclared `vendor` slug are gated as before: they follow their category.

### Apply Vue theme tokens before the first paint

The Nuxt module now adds the `tokens` CSS variables to the page head from its plugin, so server-rendered and prerendered HTML carries them on every page, with the configured `nonce`. The plain Vue plugin adds them to `document.head` when it is installed, before the first render, and removes them when the last app using them unmounts. A second app on the same page reuses the element, and a `<style id="c15t-css-vars">` rendered by the server is left in place. Before, the Vue `ConsentRoot` set them only after mount, so the first paint used the defaults, and surfaces composed without a `ConsentRoot` never got them.

For plain Vue apps rendered on the server, `generateTokensCSS()` from `@c15t/vue/vue-plugin` returns the same CSS to put in a `<style id="c15t-css-vars">` element in the server HTML.

### Label Astro legal links and show them in the preference dialog

A legal link with no `label` in `legalLinks` now reads as the translated name for its type, such as "Privacy Policy" or "Datenschutzerklärung", instead of the raw key `privacyPolicy`. The React, Vue and Svelte banners already did this.

`<ConsentDialog />` takes a `legalLinks` prop with the same list `<ConsentBanner legalLinks>` takes, and passes it to the Svelte, React or Vue dialog island. Before, the Astro preference dialog never showed legal links.

```astro
<ConsentDialog legalLinks={['privacyPolicy', 'cookiePolicy']} />
```

## c15t@3.0.0-alpha.3 (alpha)

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

### Accept `networkBlocker` in the Vue plugin, Nuxt module and Astro integration

The plain Vue plugin started the network blocker when its options carried `networkBlocker`, but `C15tVuePluginOptions` did not include the option, so passing it was a type error. The plugin's options type now covers everything it starts on mount: `networkBlocker`, `iframeBlocker`, `scripts`, `storageConfig` and `nonce`. `RuntimeConsentConfig` and `UseNetworkBlockerOptions` are exported from `@c15t/vue/vue-plugin`.

The Nuxt module accepts `networkBlocker` in `nuxt.config.ts` under `c15t`, without `onRequestBlocked`, because module options reach the browser as JSON.

The Astro integration ignored network blocking entirely. It now takes `networkBlocker` in the integration options, and in the client extension when you need `onRequestBlocked`.

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and reload the page when the source withdraws a granted category, using the existing `reloadOnConsentRevoked` option and `onBeforeConsentRevocationReload` callback. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

Keep disabled runtimes permissive when an external source is configured. Complete browser readiness after connecting the source, keep Astro preference triggers available, and reject IAB saves owned by an external CMP. External permissions disable c15t IAB authority. Deliver events for built-in Umami, Rybbit and Matomo integrations, and preserve custom GTM queue names during initialization and dispatch.

Report external CMP subscription failures without aborting provider startup. Keep optional permissions denied and ignore notifications from the failed connection.

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

### `useNetworkBlocker` holds matching requests from its first render

The standalone `useNetworkBlocker` hook installed the blocker from a mount effect. Effects in the calling component's children, and in components rendered before it, run first, so matching `fetch` and XHR requests sent from them went out without a consent check on first visits and for visitors who had rejected. The hook now holds matching requests from the first render of the component that calls it, the same way the provider's `networkBlocker` option does since the previous release, and the blocker decides them once it loads.

Holds are now tracked per caller. When a page uses both the provider option and the hook, one blocker loading or one component unmounting no longer releases requests that the other's rules still hold. A blocker configured with `enabled: false` holds nothing and no longer sends requests another caller holds. `createConsentRuntime()` (which the Svelte, Astro and browser packages use) and the Vue plugin follow the same rules, and a runtime or Vue context disposed before it starts ends only its own hold. The requests it held are answered as blocked (a 451 response for `fetch`, a failed XHR) rather than sent, since nothing checked consent for them.

### Migration

The hook's first render in the browser now has a side effect: it patches `fetch` and `XMLHttpRequest` to hold requests that match its rules. On the server it still does nothing. If React discards that render and never commits it (a render that throws, or an attempt thrown away while suspending), the hold ends after 10 seconds and the requests it held fail as blocked (a 451 response for `fetch`, a failed XHR), since nothing checked consent for them. The same applies when the hook's component, or the provider, unmounts before its blocker loads. No code changes are needed. If a test asserts that `window.fetch` is untouched after rendering a component that calls the hook, update it: during the first render `window.fetch` is the hold's wrapper, and after the blocker loads it is the blocker's.

### Stop Nuxt pages from downloading every locale on first load

In a Nuxt 4 build, every page downloaded the all-locale translations chunk (about 57 KB gzip, 206 KB raw) in its first load, in server manifest mode, hosted mode and client manifest mode alike. Only client manifest mode uses it. The Vue runtime imported the manifest resolver and the translations with two separate `import()` calls, and Vite 8 put a helper that the app entry needs into the translations chunk, so the entry loaded that chunk statically.

The runtime now loads both through one module. Server manifest and hosted mode no longer download the translations. Client manifest mode, which resolves the manifest as the page starts, now bundles the resolver with the entry through a plugin the Nuxt module adds in that mode, so the page still preloads it. Plain Vue apps built with Vite were not affected and load the same code as before.

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

### Re-render Vue components only when their consent value changes

`useHasConsent()`, `useConsentInit()` and `useConsentPolicyActions()` returned a new array or object on every kernel update, so a component reading one re-rendered whenever anything changed, including opening the dialog. They now keep their previous value while its contents are unchanged. A component using `useHasConsent()` re-renders when a category is granted or revoked, and one using `useConsentInit()` when translations, location, branding or IAB data change. The stock banner, dialog and preference widget read these values too, and follow the same rule.

### Load the Vue dialog's stylesheet with the dialog

The stock banner's description imported the dialog's style map, and a style map brings its stylesheet with it. So every page with the banner loaded the dialog's rules up front; in Nuxt they were part of the render-blocking entry stylesheet (14.7 KB raw, 2.3 KB gzip). The banner now renders its description without the dialog's map, and the dialog's rules load with the dialog's own chunk. `ConsentDescription` keeps its props and output.

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

### Block network requests sent before the network blocker loads

The network blocker loaded after mount, so a `fetch` or XHR that matched a rule and was sent from a child component's mount effect, from an effect next to the provider, or from a client module evaluated inside it went out without a consent check. This happened on first visits, for visitors who had rejected, and when the policy request failed or hung. `ConsentProvider` and `ConsentRoot` now hold matching requests from their first render in the browser, and the blocker decides them once it loads. Vue holds them from plugin install until the root mounts. `createConsentRuntime()`, which `@c15t/svelte` and the `c15t` browser client use, holds them from construction until `start()`. A provider that unmounts before its blocker loads, a runtime disposed before `start()`, or a Vue context disposed before its root mounts answers the requests it held as blocked (a 451 response for `fetch`, a failed XHR) rather than sending them, since nothing checked consent for them. Requests another caller still holds keep waiting.

While consent is unknown, a matching request that would be blocked now waits instead of failing. It is sent if the resolved policy and the visitor's stored choice allow it, and blocked if they do not or if the policy fails to load. Requests that match no rule are not delayed. Apps without `networkBlocker` still do not download the blocker; the hold adds about 0.8 KB gzip to first-load JavaScript.

Requests made before the provider renders are still out of reach, including inline scripts, tags loaded before hydration, and client modules that webpack evaluates when a route's chunk loads. The new network blocker pages for Next.js and React describe these limits and how to keep tracking calls out of that window.

## c15t@3.0.0-alpha.2 (alpha)

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

# c15t

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
  - @c15t/nextjs@3.0.0-alpha.1
  - @c15t/tanstack-start@3.0.0-alpha.1
  - @c15t/vue@3.0.0-alpha.1
  - @c15t/ui@3.0.0-alpha.1

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
  - @c15t/nextjs@3.0.0-alpha.0
  - @c15t/react@3.0.0-alpha.0
  - @c15t/tanstack-start@3.0.0-alpha.0
  - @c15t/ui@3.0.0-alpha.0
  - @c15t/vue@3.0.0-alpha.0

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

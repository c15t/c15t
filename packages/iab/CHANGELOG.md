## @c15t/iab@3.0.0-alpha.6 (alpha)

### Stop reporting tcloaded before the visitor chooses

On a first visit, `__tcfapi('addEventListener')` reported `tcloaded` with an
empty TC string while the banner showed, so an ad tag that trusts `tcloaded`
could start before the visitor chose. The CMP API now follows the TCF CMP API
v2 event rules:

- While the banner or dialog is open, listeners get `cmpuishown`, then
  `useractioncomplete` for the choice.
- `tcloaded` means a TC string is available and no UI is showing, or GDPR
  does not apply.
- Listeners hear about changes only. A withdrawn string arrives with no event
  status.

### Show saved IAB choices in the preference dialog after a reload

A returning visitor who opened the IAB preference dialog saw every switch off,
even though `__tcfapi` reported their saved consent, and pressing Save revoked
everything. The dialog starts from the stored TC string in every framework and
in `@c15t/browser`.

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

### Link IAB vendors to their privacy policies

The IAB preference dialog showed empty privacy policy links for every vendor
because GVL v3 dropped the `policyUrl` field. The links now come from each
vendor's `urls[]`, in the dialog's language with English as the fallback.

`@c15t/iab/headless` exports `resolveIABVendorUrls(vendor, language)` for
custom preference UIs, and `processGVLForDialog` takes a `language`.

### Accept All consents only to purposes your vendors declare

Under an IAB policy, Accept All used to consent to all 11 TCF purposes and every
special feature, including ones no listed vendor declares. Accept All sets
consent, legitimate interest and special feature opt-ins only for what your
vendors declare, as the TCF Policies require.

This can change which c15t categories Accept All grants. A category whose
purposes no listed vendor declares stays denied: `experience` (purposes 5 and
6), `functionality` (10 and 11), `measurement` (7 to 9) or `marketing` (2 to 4).
Scripts, iframes and network rules gated on it no longer load after Accept All.

To check, click Accept All on a fresh visit and read `effectivePermissions`. If
a category your scripts need stays denied, declare that processing as a custom
vendor through `customVendors`, or gate the script on a category your vendors
cover. See "Categories under an IAB policy" in the consent state reference.

## @c15t/iab@3.0.0-alpha.4 (alpha)

### Support IAB TCF 2.4

c15t now follows TCF 2.4 and TCF Policies v5.0.b. Existing TC strings stay valid.

- The IAB preference centre shows Features in their own section with the IAB standard text and no controls. Special Purposes stay locked.
- `__tcfapi` TC data includes `vendor.disclosedVendors`.
- `isServiceSpecific` is deprecated. TC strings always set IsServiceSpecific=1.
- Vendors that declare only Special Purposes no longer get a legitimate interest bit.
- GVL schemas keep unknown fields, so `standardTexts` survives the backend cache.

### Migration

Headless IAB UIs: `resolveIABDialogDisplayModel` now returns Features in `featureRows` instead of `essentialRows`. Render them without a control, under `featuresStandardText` or your `features.description` translation when it is `null`.

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

## @c15t/iab@3.0.0-alpha.3 (alpha)

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

## @c15t/iab@3.0.0-alpha.2 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

# @c15t/iab

## 3.0.0-alpha.1

### Patch Changes

- Updated dependencies [dd44a61]
  - @c15t/core@3.0.0-alpha.1

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
  - @c15t/schema@3.0.0-alpha.0

## 2.2.0-canary-20260731105620

### Patch Changes

- Updated dependencies [c187c9d]
  - c15t@2.2.0-canary-20260731105620

## 2.2.0-canary-20260727202135

### Patch Changes

- ace6760: Fix IAB TCF in offline mode and on override-driven re-initialization:

  - The `iab()` factory now injects `fetchGVL` into the runtime module, so offline mode (and the hosted fallback path) can load the Global Vendor List. Previously the GVL never loaded and the IAB banner silently never rendered in offline mode.
  - The GVL is requested with the resolved language (`Accept-Language`), so purpose and feature names match the rest of the consent UI.
  - `setOverrides`/`setLanguage` now pass the IAB config through re-initialization, so a language or location change refreshes the GVL instead of keeping a stale one.

- Updated dependencies [1d24803]
- Updated dependencies [05b0abb]
- Updated dependencies [8c004cf]
- Updated dependencies [16a1f82]
- Updated dependencies [ace6760]
- Updated dependencies [c7e53ff]
- Updated dependencies [ace6760]
- Updated dependencies [e4315bd]
- Updated dependencies [5406a8d]
- Updated dependencies [ca7784f]
- Updated dependencies [30cb116]
  - @c15t/schema@2.1.1-canary-20260727202135
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
  - @c15t/schema@2.1.0

## 2.0.4

### Patch Changes

- Updated dependencies [748536a]
  - @c15t/schema@2.0.1
  - c15t@2.0.4

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

### Patch Changes

- Updated dependencies [32617c9]
- Updated dependencies [32617c9]
  - c15t@2.0.0
  - @c15t/schema@2.0.0

## 2.0.0-rc.10

### Patch Changes

- Updated dependencies [9579b62]
  - c15t@2.0.0-rc.10
  - @c15t/schema@2.0.0-rc.6

## 2.0.0-rc.8

### Patch Changes

- Updated dependencies [43f1b68]
- Updated dependencies [3d4c107]
- Updated dependencies [c944e35]
- Updated dependencies [3d5b0fd]
- Updated dependencies [5956531]
  - c15t@2.0.0-rc.8
  - @c15t/schema@2.0.0-rc.5

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

- Updated dependencies [e08e52c]
- Updated dependencies [bb3ab0f]
- Updated dependencies [1a724fc]
  - c15t@2.0.0-rc.6
  - @c15t/schema@2.0.0-rc.4

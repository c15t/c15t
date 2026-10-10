## @c15t/scripts@3.0.0-alpha.9 (alpha)

### Link v3 package docs to v3.c15t.com

The `AGENTS.md` files and bundled docs in v3 packages linked to `c15t.com`,
which documents v2. Those links now point at `v3.c15t.com`, so an agent that
follows them from `node_modules` reads docs for the installed version.

### Fix upgrade links in the package READMEs

The `@c15t/node-sdk` README now links to the Node.js SDK section of the
self-host upgrade guide. The `@c15t/scripts` README and npm homepage link to
the `scripts-to-integrations` codemod. Both used to point at the root
`/docs/upgrade-v3` guide, which has been removed.

## @c15t/scripts@3.0.0-alpha.6 (alpha)

### Add a Sentry integration

Add `sentry()` from `@c15t/integrations/sentry`, with CDN and app-managed SDK modes,
CLI setup and the `@c15t/scripts/sentry` compatibility export. Errors run before
consent by default; Replay and SDK data collection wait for measurement.
`loadMode: 'after-consent'` gates errors too.

Apply consent at initialization and before sending data. Withdrawal stops Replay
without flushing pending recordings. Shared configurations coordinate consent and
reuse the SDK bundle and recorder across renders.

Add core `Script.observeConsentBeforeLoad` and `Script.resourceKey`. Shared
resources retain each registration's callbacks, consent and ownership, including
registrations that join after loading completes.

## @c15t/scripts@3.0.0-alpha.3 (alpha)

### Update documentation links

Point documentation links in CLI prompts and errors, runtime warnings, TSDoc, package READMEs and package homepages at the current c15t.com docs pages. The old addresses led to pages that were moved or removed.

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

### Rename the vendor integrations package

Replace `@c15t/scripts` with `@c15t/integrations` in v3 dependencies and imports.
Vendor subpaths, helper names, and the `scripts` configuration option stay the
same. `@c15t/scripts` remains available as a deprecated compatibility package
throughout v3, re-exporting the same implementation and types. Compatibility
ends in v4; previously published versions remain available on npm.

The CLI installs and imports `@c15t/integrations` in generated applications.
Run `c15t codemods scripts-to-integrations --dry-run --json` to preview import
changes in JavaScript and TypeScript files, then repeat without `--dry-run` to
apply them. Update package dependencies and Vue or Svelte component imports
separately.

## @c15t/scripts@3.0.0-alpha.2 (alpha)

### Encode and enforce IAB publisher restrictions

Configure TCF publisher restrictions with `publisherRestrictions` on `createIAB`, `IABProvider`, the runtime's `iab` options or the Astro integration's `iab` options. c15t writes them into the TC string's `PubRestrictions` section, decodes them from stored strings, and reports them through `__tcfapi('getTCData')` as `publisher.restrictions`. Previously that map was always empty and configured restrictions were not encoded.

Consent-gated scripts, network rules and iframes with a `vendorId` now apply the confirmed restrictions: type 0 blocks the purpose, type 1 requires consent and type 2 requires legitimate interest for purposes the vendor list marks as flexible. Accept all grants the vendor signal a restriction needs. Legitimate interest a restriction introduces applies until the visitor objects, so Save Settings encodes it as allowed, matching what the preference centres show.

The React, Vue, Svelte and `@c15t/browser/iab` preference centres list each vendor under the legal basis the restrictions leave it, so a vendor moved to legitimate interest gets an objection control instead of a consent toggle. A purpose whose vendors all use legitimate interest shows no consent switch, only the objection, and display-model rows report this as `hasConsentBasis`. Such a purpose no longer decides its c15t category, so a granular save no longer records a denial that blocks its legitimate-interest vendors; legitimate interest never grants a category on its own. Custom UIs can use `applyPublisherRestrictionsToGVL` from `@c15t/iab/headless` or pass `publisherRestrictions` to `processGVLForDialog`.

IAB gates no longer let a refused c15t category block a target that uses only legitimate interest after publisher restrictions. Such a target needs no consent under TCF, so its purpose and vendor legitimate interest signals, and the visitor's objection, decide. Previously every restriction on a referenced category blocked IAB targets; GPC, opt-out directives and strict scope still do, and the refused category still blocks scripts that name only the category or declare a consent purpose.

Unsupported restrictions throw `PublisherRestrictionError` instead of being dropped. This covers reserved type 3, vendors or purposes missing from the vendor list, legitimate interest for purposes 1 and 3 to 6, basis changes on purposes the vendor does not declare as flexible, conflicting types for one vendor, and restrictions in a string that is not service-specific. `whenReady()`, `save()` and `generateTCString()` reject, and no TC string is written. Retrying `whenReady()` does not fetch another vendor list. With an explicit `gvl`, the error lasts for the handle and saving keeps failing even if the kernel later holds a different list; a CMP following the kernel's list checks a replacement list again. When a replacement vendor list makes a restriction unsupported, the TC authority confirmed under the previous list is cleared. Whenever the CMP withdraws its own authority, including on expiry, it also removes the `euconsent-v2` cookie and localStorage entry. A stored TC string whose restrictions differ from the configuration is not restored; the banner opens again for a returning visitor and closes once they save, IAB gates stay denied until then, and the superseded `euconsent-v2` cookie and localStorage entry are removed. Decoding a string written under TCF policy version 2 or 3 accepts legitimate interest required for purposes 3 to 6, which those versions allowed.

### Share script lifecycle with external consent providers

Add an external consent source to the framework-independent runtime, React, Vue/Nuxt, Svelte/SvelteKit, browser, and Astro entrypoints. Next.js and TanStack Start inherit the controls through React options. Provider decisions update effective gates without creating c15t receipts or mounting a second persistence layer. Route preference controls to the external provider through a shared kernel event, report errors through lifecycle callbacks, and reload the page when the source withdraws a granted category, using the existing `reloadOnConsentRevoked` option and `onBeforeConsentRevocationReload` callback. Keep React script modules lazy through a lightweight controls entrypoint.

Add consent-aware custom event and SPA pageview dispatch to the script SDK, preserve Google tag configuration, support custom GTM data layers and Segment load options, and declare the script SDK's core runtime dependency for isolated package installations.

Keep disabled runtimes permissive when an external source is configured. Complete browser readiness after connecting the source, keep Astro preference triggers available, and reject IAB saves owned by an external CMP. External permissions disable c15t IAB authority. Deliver events for built-in Umami, Rybbit and Matomo integrations, and preserve custom GTM queue names during initialization and dispatch.

Report external CMP subscription failures without aborting provider startup. Keep optional permissions denied and ignore notifications from the failed connection.

### Add a Front Chat integration

`frontChat()` from `@c15t/scripts/front-chat` loads Front's chat widget after functionality permission and initializes it once the SDK loads. It forwards CSP nonces, including a loader-level nonce, to Front's generated scripts. `shutdownFrontChat()` asks Front to clear the visitor's session; call it from `onBeforeConsentRevocationReload`. The CLI offers Front Chat in its integration picker.

### Add a OneDollarStats integration

`oneDollarStats()` from `@c15t/scripts/one-dollar-stats` loads the OneDollarStats tracker after measurement permission. It needs no API key. Tracker settings are forwarded as `data-*` attributes; `hostname` must be a bare host, setting names must be valid attribute names, and `'hash-routing': 'false'` omits the attribute because the tracker treats any value as on. The CLI offers OneDollarStats in its integration picker.

### Add a Pinterest Tag integration

`pinterestTag()` from `@c15t/scripts/pinterest-tag` recreates Pinterest's base code and loads `core.js` after marketing permission. On revocation it keeps the tag and calls `pintrk('setconsent', false)`, which stops events and clears Pinterest's first-party cookies; a later grant calls `setconsent(true)`. `pinterestTagEvent()` sends typed events for Pinterest's 20 event types and user-defined names. The CLI offers Pinterest Tag in its integration picker.

## @c15t/scripts@3.0.0-alpha.1 (alpha)

### Fix declaration imports for Node16 and NodeNext

Fix declaration imports for TypeScript consumers using Node16 or NodeNext resolution. Preserve explicit JavaScript filenames so exported APIs retain their types without requiring `skipLibCheck`.

### Granular consent

Grant a category and still turn one vendor off, outside IAB TCF. Declare vendors with the `vendors` option or the backend manifest, then name them with `vendor` on scripts and network rules and `data-vendor` on iframes. A target loads when its category passes and its vendor is not off; `alwaysLoad` scripts see the result in their callbacks.

The preference centers in React, Next.js, TanStack Start, Vue, Nuxt and Svelte list each category's vendors with a switch per vendor. Switches edit the draft and record on Save, disable while the category is off, and clear on Accept all and Reject all. React adds `useVendorDraft`, `useVendorAllowed`, `useDeclaredVendors` and `useVendorChoice`; `useConsentDraft` gains `vendors` and `setVendor`; the Svelte manager state gains `selectedVendors` and `setSelectedVendor`.

Denials persist in a `<storageKey>-vendors` cookie and localStorage entry and reach the backend as `vendorChoice`. Migration `4-vendor-choice` adds the column, so run the migrator before deploying. A denial has no expiry and does not delete cookies the vendor already set.

Also fixed: the Vue preference center rendered its switches and category rows unstyled in Nuxt, and the Vue and Svelte category description colour differed from React's.

# @c15t/scripts

## 3.0.0-alpha.0

### Major Changes

- 4460e3e: This v3 alpha is for internal use only. APIs are unstable, and breaking changes will occur between alpha releases.

  Introduce the c15t umbrella package, shared consent runtime and policy rules, rewritten backend, and new framework and script-tag integrations. Update the CLI, IAB support, DevTools, and shared styles for v3.

  Packages now ship ESM only. Keep related packages on compatible v3 alpha versions.

  Export `defineTheme` and the `Theme` type from the React, Next.js, TanStack Start, and Vue entries so themes can use the same imports as their framework integration.

  Restrict iframe-blocker URL activation to HTTP and HTTPS. Replace backtracking URL and theme parsing expressions, correct the PostHog hostname boundary, and fix CLI layout detection for nested route groups and locale directories.

  Serve a stale consent manifest from the server adapters' in-process cache inside the backend's `stale-while-revalidate` window while one background request revalidates it, instead of blocking every request after `s-maxage` expires; a failed or timed-out revalidation keeps the stale manifest. The backend sends its manifest cache policy as `CDN-Cache-Control` too, so Vercel's CDN forwards it. Add `onBackgroundRevalidate` to the core cache and every server adapter for runtimes that stop detached work after the response.

## 2.2.0-canary-20260727202135

### Minor Changes

- e4315bd: Add a built-in Adobe Analytics integration for Adobe Experience Platform Data Collection Tags embed scripts.
- 2556f76: Add a built-in Amplitude Browser SDK 2 integration with measurement-consent gating, snippet-compatible pre-load queueing, runtime opt-out lifecycle hooks, docs, and live-vendor coverage.
- f98e83d: Add a built-in Clearbit integration gated on marketing consent.
- 584bb09: Add a built-in Heap integration with the current heap.js callback queue contract.
- ea4c0e4: Add a built-in Hightouch Events browser SDK integration.
- 585d84d: Add a built-in LogRocket integration that loads the browser SDK after measurement consent and initializes it with the configured app ID and options.
- 4f965cb: Add a built-in Pirsch analytics integration.
- cbf8b37: Add a built-in RudderStack integration with the v3 `rudderanalytics` queue, required write key and HTTPS data plane URL validation, optional load options and page tracking, docs, registry metadata, and live vendor probe coverage.
- ab8ecad: Fix Microsoft Clarity integration: the pre-load stub no longer sets the `v` version marker — Clarity's runtime treats a pre-set `v` as a duplicate install ("Error CL001: Multiple Clarity tags detected") and never starts, so installs collected no data. Consent synchronization now uses Clarity Consent V2 (`consentv2` with `ad_Storage`/`analytics_Storage`), mapping c15t `marketing` to `ad_Storage` and `measurement` to `analytics_Storage`. The `defaultConsent` option now accepts a Consent V2 payload; boolean values are still supported and expand to both storage channels.
- 613ba22: Add an opt-in pre-consent mode to the RudderStack helper: `consentManagement.mapping` maps c15t categories to RudderStack consent IDs, loads the SDK inert (`preConsent` with storage strategy `none` and buffered delivery), and signals every consent decision through `rudderanalytics.consent()` — preserving pre-consent event attribution for consenting users. Blocking the load remains the default. The manifest engine gains a `rudderstack` consent signal type alongside `gtag`.

### Patch Changes

- c89ce28: Fix Mixpanel integration: implement the official snippet contract (`__SV` version marker and `_i` init registry) so `mixpanel-2-latest.min.js` initializes from the stub instead of logging "Mixpanel error: Version mismatch" and silently dropping queued events.

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

## 2.0.1

### Patch Changes

- e2b9f7b: Fix vendor bootstrap queue payloads so Google, Meta Pixel, and X Pixel receive
  real `arguments` objects instead of flattened arrays, and add contract tests for
  all shipped script helpers to verify their load-time handshakes.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2.0.0

## 1.1.0-rc.1

### Minor Changes

- c944e35: feat(core): move policy action resolution from @c15t/react to c15t core

  Policy-driven action resolution utilities (`resolvePolicyAllowedActions`, `resolvePolicyActionGroups`, `resolvePolicyPrimaryActions`, etc.) are now exported from `c15t` core for shared consent surface runtimes.

  feat(scripts): move bundled integrations to declarative, schema-versioned `VendorManifest` definitions compiled through `resolveManifest()`. The manifest runtime now supports structured startup and consent phases, complex consent conditions, compile caching, and Google Consent Mode v2 signaling without helper-authored lifecycle overrides.

  feat(dev-tools): add script lifecycle and manifest runtime telemetry to the events and scripts panels, including grouped activity traces for `onBeforeLoad`, `onLoad`, and `onConsentChange`.

### Patch Changes

- 918a70e: Fix published TypeScript declaration packaging so consumers stay compatible across both TypeScript 5 and TypeScript 6.

  - `@c15t/react`: correct the `./primitives` type export entries so they point at the published `dist-types` files instead of missing declaration paths.
  - `@c15t/backend`, `@c15t/cli`, `@c15t/dev-tools`, `@c15t/logger`, `@c15t/node-sdk`, and `@c15t/scripts`: normalize emitted `dist-types` imports during builds so published declarations no longer reference sibling `.d.ts` files directly, which could break consumers on newer TypeScript versions.
  - Tooling: make declaration normalization discover package targets dynamically so the compatibility fix applies consistently across published packages instead of only a hardcoded subset.

## 1.0.2-rc.0

### Patch Changes

- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

## 2.0.0-rc.1

### Patch Changes

- 0bc4f86: fixed workspace resolving

## 2.0.0-rc.0

### Major Changes

- 126a78b: https://c15t.com/changelog/2.0.0-rc.0

## 1.0.1

### Patch Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/1.8.0

## 1.0.1-canary-20251112105612

### Patch Changes

- 5f75d2f: feat: add databuddy integration
- 6e3034c: refactor: update rslib to latest version

## 1.0.0

### Major Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/1.7.0

## 1.0.0-canary-20251012181938

### Major Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/1.6.0).

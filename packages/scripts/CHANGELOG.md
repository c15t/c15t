# @c15t/scripts

## 2.2.0-canary-20260804162155

### Patch Changes

- 1116dce: Preserve `posthog.capture(...)` calls made after c15t bootstraps PostHog but before its SDK finishes loading.

  The helper now uses PostHog's root snippet queue and pending init tuple, with the current consent decision queued before captured events replay. It also leaves an already-installed PostHog SDK unchanged during later consent revoke and re-grant cycles.

- d481939: Fix the PostHog integration loading no analytics runtime at all. Since posthog-js 1.410.2, `array.js` refuses to install itself over an existing `window.posthog` that has no snippet-shaped pending-init queue, so c15t's bootstrap stub was left in place and every call — including `init` — silently became a no-op. The stub now seeds `_i` like the official snippet does.

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

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

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

- 126a78b: https://c15t.com/changelog/2026-02-12-v2.0.0-rc.0

## 1.0.1

### Patch Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

## 1.0.1-canary-20251112105612

### Patch Changes

- 5f75d2f: feat: add databuddy integration
- 6e3034c: refactor: update rslib to latest version

## 1.0.0

### Major Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0

## 1.0.0-canary-20251012181938

### Major Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).

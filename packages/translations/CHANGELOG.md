# @c15t/translations

## 2.2.0-canary-20260727202135

### Minor Changes

- 1d24803: Add Gujarati (`gu`) translations for cookie banner, consent dialog, and IAB TCF consent UI copy.
- 05b0abb: Add Hindi (`hi`) translations for cookie banner, consent dialog, and IAB TCF consent UI copy.
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
- c8690f9: Fix a stray German word in the Latvian IAB custom vendors notice: "pamatojoties auf jūsu piekrišanu" is now "pamatojoties uz jūsu piekrišanu".
- c8690f9: Translate the second sentence of the IAB preference-center consent storage notice (`iab.preferenceCenter.footer.consentStorage`) — "The storage duration may be refreshed when you update your preferences." — which was previously left in English in all 32 non-English locales.

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

- 1588a24: Fix German translations to use consistent casing and tone.

## 2.0.0

### Major Changes

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

## 2.0.0-rc.8

### Patch Changes

- fee82fd: Refine prebuilt consent-surface branding so it feels attached to the UI instead of appended.

  - `@c15t/react`: add attached branding tags to the stock consent banner, consent dialog, IAB banner, and IAB dialog; localize the branding copy through translations; and add a `hideBranding` prop to the stock `ConsentBanner` component.
  - `@c15t/nextjs`: keep the published stylesheet entrypoints aligned with the updated prebuilt branding treatment while simplifying stylesheet distribution to reference upstream package styles directly.
  - `@c15t/ui`: update the shared consent branding tag styles for tighter edge attachment, smaller visual footprint, and consistent banner/dialog treatment across standard and IAB surfaces.
  - `@c15t/translations`: add the shared localized branding copy used by the updated prebuilt consent surfaces.

## 2.0.0-rc.5

### Patch Changes

- 58fb392: Rename translation-facing APIs from `translations` to `i18n` across runtime types and helpers.
  Add CLI migration codemods to update existing projects to the new naming.
- e79f840: Separate published declaration files from runtime bundles to improve Vite compatibility

  - Move generated `.d.ts` files out of `dist/` into `dist-types/` across published packages
  - Stop emitting declaration maps in shared TypeScript config so `.d.ts.map` files are no longer published
  - Emit declarations only once per package to avoid unstable output when both `esm` and `cjs` builds write types
  - Update package `types` metadata, publish file lists, Turbo outputs, and publish artifact checks for the new layout
  - Verify the package layout works in Vite 7 without `optimizeDeps.exclude` workarounds for `c15t` and `@c15t/react`

## 1.8.5

### Patch Changes

- be4e218: Republish patch release to fix workspace dependency protocol resolution during publish.

  Published package manifests now resolve `workspace:*` references to concrete semver ranges before release.

## 1.8.4

### Patch Changes

- 8defcd9: Update direct and transitive dependencies to address known vulnerabilities and keep runtime/tooling packages current.

## 1.8.0

### Minor Changes

- 68a7324: Full Changelog: https://c15t.com/changelog/2025-10-27-v1.8.0

## 1.8.0-canary-20251112105612

### Minor Changes

- 221a553: feat: add support for all EU languages
- 7043a2e: feat: add configurable legal links to consent banner and consent dialog

### Patch Changes

- 6e3034c: refactor: update rslib to latest version

## 1.7.0

### Minor Changes

- aa16d03: You can find the full changelog at https://c15t.com/changelog/2025-10-11-v1.7.0

## 1.7.0-canary-20251012181938

### Minor Changes

- 0c80bed: feat: added script loader, deprecated tracking blocker
- a58909c: feat(react): added frame component for conditionally rendering content with a placeholder e.g. iframes
  feat(core): added headless iframe blocking with the data-src & data-category attributes
  fix(react): improved button hover transitions when changing theme

## 1.6.0

### Minor Changes

- 84ab0c7: For a full detailed changelog see the [v1.6.0 release notes](https://c15t.com/changelog/2025-09-08-v1.6.0).

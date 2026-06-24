# @c15t/iab

## 2.1.1-canary-20260624181535

### Patch Changes

- Updated dependencies [8c004cf]
  - @c15t/schema@2.1.1-canary-20260624181535
  - c15t@2.1.1-canary-20260624181535

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

- 32617c9: Changelog available at https://c15t.com/changelog/2026-04-14-v2.0.0

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
